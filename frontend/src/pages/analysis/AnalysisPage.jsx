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

  if (docs.loading) return <LoadingSpinner />;
  if (docs.error) return <ErrorMessage error={docs.error} onRetry={() => setTries((n) => n + 1)} />;
  if (!docs.postings.length || !docs.resumes.length) {
    return <EmptyState message="공고 1개와 이력서 1개를 고르세요" action={<Link to={ROUTES.DOCUMENTS}>문서 올리러 가기</Link>} />;
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
    <section className={`${styles.card} ${styles.picker}`}>
      {select('채용공고', 'postingId', postingId, docs.postings)}
      {select('이력서', 'resumeId', resumeId, docs.resumes)}
      <Button disabled={disabled || !postingId || !resumeId} onClick={() => onStart({ postingId, resumeId })}>분석 시작</Button>
    </section>
  );
}
DocumentPicker.propTypes = { onStart: PropTypes.func.isRequired, disabled: PropTypes.bool.isRequired };

function MessageList({ messages }) {
  return (
    <>
      {messages.map((m, i) => (m.role === 'USER'
        ? <p key={i} className={styles.user}>{m.content}</p>
        : (
          <article key={i} className={styles.card}>
            <ReportText text={m.content} />
            {m.stopped && <p className={styles.note}>중단됨 — 여기까지의 답변은 화면에만 남고 기록에는 저장되지 않습니다</p>}
            <SourceChips sources={m.sources} />
          </article>
        )))}
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
      <textarea value={question} maxLength={1000} rows={2} aria-label="후속 질문"
        placeholder="후속 질문을 입력하세요 (예: 부족한 것부터 뭘 공부해?)" onChange={(e) => setQuestion(e.target.value)} />
      <Button type="submit" disabled={!question.trim()}>보내기</Button>
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
  useEffect(() => {
    if (streaming && analysisId && analysisId !== id) navigate(ROUTES.analysis(analysisId), { replace: true });
  }, [analysisId]);
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
      <h1 className={styles.title}>갭 분석</h1>
      {!id && <DocumentPicker onStart={run} disabled={streaming} />}
      <MessageList messages={messages} />
      {error && <ErrorMessage error={error} onRetry={streaming ? null : retry} />}
      {streaming && (
        <div className={styles.bar}>
          <LoadingSpinner label="생성 중…" />
          <Button variant="secondary" onClick={stop}>중단</Button>
        </div>
      )}
      {/* 새 분석이 리포트 없이 실패하면(messages 비어 있음) 이어 쓸 대화가 없다 — 재시도로만 다시 시작 */}
      {!streaming && analysisId && messages.length > 0 && <FollowUpForm onSubmit={(question) => run({ analysisId, question })} />}
    </div>
  );
}
