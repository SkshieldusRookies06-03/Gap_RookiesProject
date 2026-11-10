"""AI 평가용 세 조건 실행기 (오너: AI · 티켓 T-035).
graph.stream_events(req, use_retrieval=…, use_web=…)를 세 조건으로 부르고 답변을 eval/answers/<조건>/<번호>.md 로 저장한다.
eval/result.md 를 만들어 '자동 참고 집계' 표를 채우고, '사람 채점' 표는 빈칸으로 둔다
→ 사람이 답변 파일을 보고 result.md 의 '사람 채점' 빈칸에 정답 수·근거 표시율을 적는다.
(result.md 에 LLM·RAG·Tavily 세 열이 있어야 rubric 게이트가 통과한다)
 
실행(ai-module 폴더) — 모델은 --provider 로만 바꾼다(.env 는 키만 쓴다):
  uv run --env-file ../.env python eval/run_eval.py --provider openai   → answers/ · result.md (공식)
  uv run --env-file ../.env python eval/run_eval.py --provider groq     → answers-groq/ · result-groq.md (비교)
  uv run python eval/run_eval.py --provider fake                        → answers-fake/ · result-fake.md (연습)
"""
import argparse
import asyncio
import json
import os
import re
import sys
import tempfile
import uuid
from pathlib import Path
 
DEFAULT_MODEL = {"openai": "gpt-4o-mini", "groq": "openai/gpt-oss-20b", "fake": "fake"}
 
ap = argparse.ArgumentParser(description="AI 평가용 세 조건 실행기")
ap.add_argument("--provider", choices=list(DEFAULT_MODEL), help="없으면 .env 의 LLM_PROVIDER")
ap.add_argument("--model", help="없으면 provider 기본 모델 (openai: gpt-4o-mini · groq: openai/gpt-oss-20b)")
args = ap.parse_args()
 
if args.provider:
    os.environ["LLM_PROVIDER"] = args.provider
    os.environ["LLM_MODEL"] = args.model or DEFAULT_MODEL[args.provider]
elif args.model:
    os.environ["LLM_MODEL"] = args.model
EVAL = Path(__file__).resolve().parent
sys.path.insert(0, str(EVAL.parent))
os.environ["VECTOR_DIR"] = tempfile.mkdtemp(prefix="eval-vector-")      
 
from app import graph, vectorstore        
from app.config import settings           
from app.schemas import AnalyzeRequest    
 
CONDITIONS = {                            
    "1-llm": ("① LLM 단독", False, False),
    "2-rag": ("② +RAG", True, False),
    "3-rag-tavily": ("③ +RAG+Tavily", True, True),
}
 
 
def out_names(provider: str) -> tuple[Path, Path]:
    """openai = 공식(answers/ · result.md) · 그 밖은 이름에 공급자를 붙여 공식 결과를 덮어쓰지 않는다"""
    if provider == "openai":
        return EVAL / "answers", EVAL / "result.md"
    return EVAL / f"answers-{provider}", EVAL / f"result-{provider}.md"
 
 
def read_questions() -> list[dict]:
    """questions.md 표 → 문항 목록"""
    rows = []
    for line in (EVAL / "questions.md").read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 6 and cells[0].isdigit():
            rows.append(dict(zip(["no", "posting", "resume", "question", "answer", "web"], cells)))
    return rows
 
 
def posting_title(path: Path) -> str:
    """공고 첫 줄 '# [직무] 회사' → '회사 직무' (Tavily 질의에 쓰인다)"""
    first = path.read_text(encoding="utf-8").splitlines()[0].lstrip("# ").strip()
    if first.startswith("[") and "]" in first:
        role, company = first[1:].split("]", 1)
        return f"{company.strip()} {role.strip()}"
    return first
 
 
def keywords(row: dict) -> list[list[str]]:
    """자동 참고 채점용 정답 키워드. N: 'A·B/C' → [[A],[B,C]] · Y: 작은따옴표 안 문구"""
    if row["web"] == "Y":
        m = re.search(r"'([^']+)'", row["answer"])
        return [[m.group(1)]] if m else []
    return [[alt.strip() for alt in re.sub(r"\(.*?\)", "", part).split("/")] for part in row["answer"].split("·")]
 
 
def auto_hits(answer: str, keys: list[list[str]]) -> int:
    norm = lambda s: re.sub(r"\s", "", s).lower()  # noqa: E731
    text = norm(answer)
    return sum(any(norm(alt) in text for alt in alts if alt) for alts in keys)
 
 
async def ask(owner: str, row: dict, use_retrieval: bool, use_web: bool) -> tuple[str, list]:
    report = row["question"] == "갭 분석 리포트"
    req = AnalyzeRequest(ownerUuid=owner, postingId=f"q{row['no']}-p", resumeId=f"q{row['no']}-r",
                         postingTitle=posting_title(EVAL / "data" / row["posting"]),
                         mode="REPORT" if report else "FOLLOWUP", question="" if report else row["question"])
    answer, sources = "", []
    async for frame in graph.stream_events(req, use_retrieval=use_retrieval, use_web=use_web):
        event, data = (line.split(": ", 1)[1] for line in frame.strip().splitlines())
        if event == "token":
            answer += json.loads(data)
        elif event == "sources":
            sources = json.loads(data)
    return answer, sources
 
 
async def ask_with_retry(owner: str, row: dict, use_retrieval: bool, use_web: bool) -> tuple[str, list]:
    """무료 요금제 분당 토큰 제한 — 429(사용량 제한)가 나면 60초 쉬고 다시 시도(최대 4번)"""
    for attempt in range(1, 6):
        try:
            return await ask(owner, row, use_retrieval, use_web)
        except Exception as e:
            if "429" not in str(e) or attempt == 5:
                raise
            print(f"   ↳ 사용량 제한(429) — 60초 쉬고 다시 시도 ({attempt}/4)")
            await asyncio.sleep(60)
 
 
async def main() -> None:
    s, owner, rows = settings(), str(uuid.uuid4()), read_questions()
    answers_dir, result_path = out_names(s.llm_provider)
    print(f"모델: {s.llm_provider}/{s.llm_model} → {answers_dir.name}/ · {result_path.name}")
    for row in rows:                                       # 공고·이력서를 평가용 인덱스에 넣는다
        for suffix, doc_type, rel in (("p", "JOB_POSTING", row["posting"]), ("r", "RESUME", row["resume"])):
            path = EVAL / "data" / rel
            vectorstore.ingest_document(f"q{row['no']}-{suffix}", owner, doc_type, path.stem,
                                        path.read_text(encoding="utf-8"))
    table = {}                                             # (번호, 조건) → (자동 일치 수, 키워드 수, 근거 있음)
    for row in rows:
        keys = keywords(row)
        for cond, (_, use_retrieval, use_web) in CONDITIONS.items():
            answer, sources = await ask_with_retry(owner, row, use_retrieval, use_web)
            out = answers_dir / cond / f"{int(row['no']):02d}.md"
            out.parent.mkdir(parents=True, exist_ok=True)
            src = "\n".join(f"- {x.get('type')} {x.get('documentId') or x.get('url')}" for x in sources) or "- (없음)"
            out.write_text(f"# {row['no']}. {row['question']}\n\n정답: {row['answer']}\n\n## 답변\n\n{answer}\n\n## 근거\n\n{src}\n",
                           encoding="utf-8")
            table[row["no"], cond] = (auto_hits(answer, keys), len(keys), bool(sources))
            print(f"[{row['no']:>2}] {cond:<13} 자동 {table[row['no'], cond][0]}/{len(keys)} · 근거 {len(sources)}개")
    write_result(s, rows, table, answers_dir, result_path)
 
 
def write_result(s, rows: list[dict], table: dict, answers_dir: Path, result_path: Path) -> None:
    heads = [title for title, _, _ in CONDITIONS.values()]
    lines = ["# AI 평가용 데이터 세 조건 평가 결과 (T-035 · R-AI03)", "",
             f"- 모델: LLM `{s.llm_provider}/{s.llm_model}` · 임베딩 `{s.embedding_model}` · Tavily {s.tavily_results}건",
             f"- 답변 원문: `eval/{answers_dir.name}/<조건>/<번호>.md` · "
             f"실행: `uv run --env-file ../.env python eval/run_eval.py --provider {s.llm_provider}`",
             "- 자동 = 정답 키워드가 답변에 나온 개수(참고용). **정답 여부는 사람 2명이 채점하고 불일치는 팀장이 판정**", "",
             "## 자동 참고 집계", "", "| 번호 | 웹 | " + " | ".join(heads) + " |", "|---|---|" + "---|" * len(heads)]
    for row in rows:
        cells = [f"{h}/{n} · 근거 {'O' if src else 'X'}" for h, n, src in (table[row["no"], c] for c in CONDITIONS)]
        lines.append(f"| {row['no']} | {row['web']} | " + " | ".join(cells) + " |")
    lines += ["", "## 사람 채점 (정답 수 · 근거 표시율)", "", "| 지표 | " + " | ".join(heads) + " |",
              "|---|" + "---|" * len(heads), "| 정답 수 (/10) |" + " |" * len(heads),
              "| 근거 표시율 |" + " |" * len(heads), ""]
    result_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n→ {result_path}")
 
 
if __name__ == "__main__":
    asyncio.run(main())