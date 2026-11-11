import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { ROUTES } from '../../routes.js';
import { useChatStream } from '../../hooks/useChatStream.js';
import { useChatStore } from '../../stores/chatStore.js';
import Button from '../../components/Button.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ReportText from './ReportText.jsx';
import SourceChips from './SourceChips.jsx';
import styles from './Analysis.module.css';

// 분석 화면 (오너: FE-분석 · T-022 · SPEC §4.3 · §5) — 기록 재진입(GET messages → hydrate)은 T-030
const listOf = (type) => api.get(`/api/documents?type=${type}&page=0&size=50&sort=createdAt,desc`).then((d) => d.content);

function DocumentPicker({ onStart, disabled }) {
  const [docs, setDocs] = useState({ loading: true, error: null, postings: [], resumes: [] });
  const [tries, setTries] = useState(0);
  const picked = useChatStore((s) => s.picked);
  const setPicked = useChatStore((s) => s.setPicked);
  useEffect(() => {
    let alive = true;
    setDocs((d) => ({ ...d, loading: true, error: null }));
    Promise.all([listOf('JOB_POSTING'), listOf('RESUME')])
      .then(([postings, resumes]) => alive && setDocs({ loading: false, error: null, postings, resumes }))
      .catch((error) => alive && setDocs((d) => ({ ...d, loading: false, error })));
    return () => { alive = false; };
  }, [tries]);

  // 로딩·오류·빈 상태도 같은 카드 안에 — 화면 골격이 상태마다 흔들리지 않게(Figma States 01b)
  if (docs.loading) return <section className={styles.card}><LoadingSpinner /></section>;
  if (docs.error) return <section className={styles.card}><ErrorMessage error={docs.error} onRetry={() => setTries((n) => n + 1)} /></section>;
  if (!docs.postings.length || !docs.resumes.length) {
    return <section className={styles.card}><EmptyState message="공고 1개와 이력서 1개를 고르세요" action={<Link to={ROUTES.DOCUMENTS}>문서 올리러 가기</Link>} /></section>;
  }
  // 기억한 선택이 지금 목록에 없으면(삭제됨) 고르지 않은 것으로 본다
  const valid = (list, id) => (list.some((d) => d.id === id) ? id : '');
  const postingId = valid(docs.postings, picked.postingId);
  const resumeId = valid(docs.resumes, picked.resumeId);
  const select = (label, key, value, list) => (
    <label className={styles.field}>
      {label}
      <select value={value} disabled={disabled} onChange={(e) => setPicked({ [key]: e.target.value })}>
        <option value="">{label}를 선택하세요</option>
        {list.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
      </select>
    </label>
  );
  return (
    <section className={`${styles.card} ${styles.picker}`} aria-labelledby="picker-title">
      <div>
        <h2 id="picker-title" className={styles.pickerTitle}>분석할 문서 선택</h2>
        <p className={styles.pickerHint}>채용공고 1개와 이력서 1개를 고르면 요구 기술과 보유 여부를 비교한 리포트를 만들어요</p>
      </div>
      <div className={styles.fields}>
        {select('채용공고', 'postingId', postingId, docs.postings)}
        {select('이력서', 'resumeId', resumeId, docs.resumes)}
      </div>
      <div className={styles.actions}>
        <Button disabled={disabled || !postingId || !resumeId} onClick={() => onStart({ postingId, resumeId })}>분석 시작</Button>
      </div>
    </section>
  );
}
DocumentPicker.propTypes = { onStart: PropTypes.func.isRequired, disabled: PropTypes.bool.isRequired };

// 답변 카드 머리의 상태 표시 (Figma Analysis States 02·03·04)
const statusOf = (m, live) => (live ? ['생성 중', 'live'] : m.stopped ? ['중단됨', 'stopped'] : ['완료', 'done']);

function MessageList({ messages, streaming, lastRef }) {
  const lastIndex = messages.length - 1;
  return (
    <>
      {messages.map((m, i) => {
        if (m.role === 'USER') return <p key={i} className={styles.user}>{m.content}</p>;
        // L-2: 첫 토큰 전에 멈추면 빈 카드 대신 안내 한 줄
        if (m.stopped && !m.content) return <p key={i} className={styles.notice}>중단됨 — 답변이 시작되기 전에 중단했습니다. 기록에는 저장되지 않습니다</p>;
        const [label, tone] = statusOf(m, streaming && i === lastIndex);
        return (
          <article key={i} ref={i === lastIndex ? lastRef : undefined} tabIndex={-1} aria-label={`GAP 분석 · ${label}`} className={`${styles.card} ${styles.answer}`}>
            <div className={styles.answerHead}>
              <span className={styles.mark} aria-hidden="true">✦</span>
              <span className={styles.who}>GAP 분석</span>
              <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>
            </div>
            <ReportText text={m.content} />
            {m.stopped && <p className={styles.notice}>생성을 중단했습니다. 여기까지의 답변은 화면에만 남고 기록에는 저장되지 않습니다</p>}
            <SourceChips sources={m.sources} />
          </article>
        );
      })}
      {/* 마지막이 USER면 그 질문의 답변은 저장되지 않았다(SPEC §4.3 — ASSISTANT는 완주했을 때만 저장) */}
      {messages.at(-1)?.role === 'USER' && <p className={styles.note}>답변 없음(중단됨)</p>}
    </>
  );
}
MessageList.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.oneOf(['USER', 'ASSISTANT']).isRequired,
    content: PropTypes.string.isRequired,
    sources: PropTypes.array,
    stopped: PropTypes.bool,
  })).isRequired,
  streaming: PropTypes.bool.isRequired,
  lastRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
};

function FollowUpForm({ onSubmit }) {
  const [question, setQuestion] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    onSubmit(question.trim());
    setQuestion('');
  };
  return (
    <form className={styles.bar} onSubmit={submit}>
      <div className={styles.inputBox}>
        <textarea value={question} maxLength={1000} rows={1} aria-label="후속 질문" aria-describedby="followup-meta"
          placeholder="후속 질문을 입력하세요 (예: 부족한 것부터 뭘 공부해?)" onChange={(e) => setQuestion(e.target.value)} />
        <Button type="submit" disabled={!question.trim()}>보내기</Button>
      </div>
      <p id="followup-meta" className={styles.meta}><span>질문은 최대 1000자</span><span>{question.length} / 1000</span></p>
    </form>
  );
}
FollowUpForm.propTypes = { onSubmit: PropTypes.func.isRequired };

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { messages, streaming, error, analysisId, start, stop, hydrate, reset } = useChatStream();
  const [load, setLoad] = useState({ loading: false, error: null });
  const lastReq = useRef(null);
  const lastRef = useRef(null);
  const wasStreaming = useRef(false);
  const [announce, setAnnounce] = useState('');
  const run = (req) => { lastReq.current = req; start(req); };
  // 재시도 = 실패한 요청 그대로(새 분석은 {postingId, resumeId}, 후속은 {analysisId, question}).
  // 후속 질문이면 실패로 남은 USER 말풍선을 먼저 걷어 낸다 — start()가 같은 질문을 다시 붙이므로 화면에 두 번 보이지 않게
  const retry = () => {
    const req = lastReq.current;
    const last = messages.at(-1);
    if (req.question && last?.role === 'USER' && last.content === req.question) hydrate(messages.slice(0, -1));
    run(req);
  };

  // 새 분석이 analysis 이벤트를 받으면 URL만 바꾼다(SPEC §5) · 내비 "새 분석"으로 돌아오면 이전 대화를 비운다
  // URL 교체는 analysisId가 새로 발급된 순간에만 — id가 바뀔 때 다시 돌면 reset() 전의 옛 id로 되돌아간다
  // 새 분석이 analysis 뒤 error로 끝나 /analyses/N에서 재시도하면 새 id M이 온다 — 그때도 URL을 M으로 맞춘다
  // L-1: streaming은 보지 않는다 — analysis·error가 한 조각으로 오면 렌더 전에 이미 false다.
  // hydrate(…, id)는 id === analysisId · reset()은 null이라 여기서 이동하지 않는다
  useEffect(() => {
    if (analysisId && analysisId !== id) navigate(ROUTES.analysis(analysisId), { replace: true });
  }, [analysisId]);

  // L-3: 생성이 끝나면 화면낭독기에 알리고 포커스를 새 답변 카드로(스크롤은 그대로) — 오류는 ErrorMessage(role=alert)가 알린다
  useEffect(() => {
    if (streaming) setAnnounce('');
    else if (wasStreaming.current && !error) {
      setAnnounce(messages.at(-1)?.stopped ? '생성을 중단했습니다' : '답변 생성이 끝났습니다');
      lastRef.current?.focus({ preventScroll: true });
    }
    wasStreaming.current = streaming;
  }, [streaming]);
  useEffect(() => { if (!id) { reset(); setLoad({ loading: false, error: null }); } }, [id, reset]);

  // /analyses/:id 진입 — 지난 대화를 불러와 hydrate한다. 방금 만든 분석으로 URL만 바뀐 경우(id === analysisId)는
  // 진행 중인 스트림을 덮지 않게 건너뛴다(SPEC §5). 다른 분석이면 이전 대화·스트림을 먼저 버린다.
  // id가 바뀔 때만 돈다 — analysisId 변화(hydrate·reset)로 다시 돌면 같은 요청이 두 번 나간다
  useEffect(() => {
    if (!id || id === analysisId) return undefined;
    let alive = true;
    reset();
    setLoad({ loading: true, error: null });
    api.get(`/api/analyses/${id}/messages?page=0&size=50`)
      .then((d) => { if (alive) { hydrate(d.content, id); setLoad({ loading: false, error: null }); } })
      .catch((e) => alive && setLoad({ loading: false, error: e }));   // 남의 분석 403 · 없음 404
    return () => { alive = false; };
  }, [id]);

  if (load.loading) return <div className={styles.chat}><LoadingSpinner /></div>;
  if (load.error) {
    return (
      <div className={styles.chat}>
        <ErrorMessage error={load.error} />
        <Link to={ROUTES.ANALYSES}>기록으로</Link>
      </div>
    );
  }
  return (
    <div className={styles.chat}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{id ? '분석' : '새 분석'}</h1>
          <p className={styles.sub}>{id ? '리포트와 후속 질문 대화 · 이어서 질문할 수 있어요' : '채용공고와 이력서를 비교해 부족한 기술과 준비 순서를 알려 드려요'}</p>
        </div>
        <Link className={styles.back} to={ROUTES.ANALYSES}><span aria-hidden="true">‹</span> 분석 기록</Link>
      </header>
      {!id && <DocumentPicker onStart={run} disabled={streaming} />}
      <MessageList messages={messages} streaming={streaming} lastRef={lastRef} />
      <p className={styles.srOnly} role="status" aria-live="polite">{announce}</p>
      {error && <ErrorMessage error={error} onRetry={streaming ? null : retry} />}
      {streaming && (
        <div className={`${styles.bar} ${styles.status}`}>
          <LoadingSpinner label="생성 중…" />
          <Button variant="secondary" onClick={stop}>중단</Button>
        </div>
      )}
      {/* 새 분석이 리포트 없이 실패하면(messages 비어 있음) 이어 쓸 대화가 없다 — 재시도로만 다시 시작 */}
      {!streaming && analysisId && messages.length > 0 && <FollowUpForm onSubmit={(question) => run({ analysisId, question })} />}
    </div>
  );
}
