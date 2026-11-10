import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { api } from '../../api/client.js';
import { ROUTES } from '../../routes.js';
import { useChatStream } from '../../hooks/useChatStream.js';
import { useChatStore } from '../../stores/chatStore.js';
import Button from '../../components/Button.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import ReportText from './ReportText.jsx';
import SourceChips from './SourceChips.jsx';
import styles from './Analysis.module.css';

/** 문서 선택기 (오너: FE-분석 · SPEC §4.3 · §5) */
function DocumentPicker({ postings, resumes, picked, onPick, onStart, disabled }) {
  const canStart = !disabled && Boolean(picked.postingId && picked.resumeId);
  return (
    <div className={styles.card}>
      <form className={styles.picker} onSubmit={(e) => { e.preventDefault(); if (canStart) onStart(); }}>
        <label className={styles.field}>
          <span>채용공고 *</span>
          <select value={picked.postingId} disabled={disabled} onChange={(e) => onPick({ postingId: e.target.value })}>
            <option value="">공고를 선택하세요</option>
            {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>이력서 *</span>
          <select value={picked.resumeId} disabled={disabled} onChange={(e) => onPick({ resumeId: e.target.value })}>
            <option value="">이력서를 선택하세요</option>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        <Button type="submit" disabled={!canStart}>분석 시작</Button>
      </form>
    </div>
  );
}
DocumentPicker.propTypes = {
  postings: PropTypes.array.isRequired, resumes: PropTypes.array.isRequired,
  picked: PropTypes.object.isRequired, onPick: PropTypes.func.isRequired,
  onStart: PropTypes.func.isRequired, disabled: PropTypes.bool.isRequired,
};

/** 후속 질문 바 (SPEC §4.3 · 최대 1000자) */
function FollowUpForm({ onSubmit, disabled }) {
  const [question, setQuestion] = useState('');
  const canSend = !disabled && question.trim().length > 0 && question.length <= 1000;
  const submit = (e) => { e.preventDefault(); if (canSend) { onSubmit(question.trim()); setQuestion(''); } };
  return (
    <div className={styles.followUpSection}>
      <form className={styles.followUpForm} onSubmit={submit}>
        <div className={styles.followUpInputRow}>
          <textarea
            className={styles.followUpTextarea}
            placeholder="후속 질문을 입력하세요 (예: 부족한 것부터 뭘 공부해?)"
            value={question} maxLength={1000} disabled={disabled}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button type="submit" disabled={!canSend}>보내기</Button>
        </div>
        <div className={styles.followUpMeta}>
          <span>질문은 최대 1000자</span>
          <span>{question.length} / 1000</span>
        </div>
      </form>
    </div>
  );
}
FollowUpForm.propTypes = { onSubmit: PropTypes.func.isRequired, disabled: PropTypes.bool.isRequired };

/** 분석 상세 화면 (오너: FE-분석 · 티켓 T-022·T-030 · SPEC §4.3 · §5) */
export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { messages, streaming, error, analysisId, start, stop, hydrate } = useChatStream();
  const { picked, setPicked } = useChatStore();
  const [docs, setDocs] = useState([]);
  const [fetchErr, setFetchErr] = useState(null);

  useEffect(() => {
    api.get('/api/documents?size=100').then((d) => setDocs(d.content ?? [])).catch(setFetchErr);
  }, []);

  useEffect(() => {
    if (!id && analysisId) navigate(ROUTES.analysis(analysisId), { replace: true });
  }, [id, analysisId, navigate]);

  useEffect(() => {
    if (!id || streaming || analysisId === id) return;
    api.get(`/api/analyses/${id}/messages?page=0&size=50`)
      .then((data) => hydrate(data.content ?? [], id)).catch(setFetchErr);
  }, [id, streaming, analysisId, hydrate]);

  const postings = docs.filter((d) => d.type === 'JOB_POSTING');
  const resumes = docs.filter((d) => d.type === 'RESUME');
  const activeId = id || analysisId;

  return (
    <div className={styles.chat}>
      <div className={styles.headerArea}>
        <div className={styles.headerTitles}>
          <h1 className={styles.title}>분석</h1>
          <p className={styles.subtitle}>리포트와 후속 질문 대화 · 이어서 질문할 수 있어요</p>
        </div>
        <Link to={ROUTES.ANALYSES} className={styles.backLink}>&lt; 분석 기록</Link>
      </div>

      {!activeId && (
        <DocumentPicker
          postings={postings} resumes={resumes} picked={picked} onPick={setPicked}
          onStart={() => start({ postingId: picked.postingId, resumeId: picked.resumeId })} disabled={streaming}
        />
      )}

      {fetchErr && <ErrorMessage error={fetchErr} onRetry={() => setFetchErr(null)} />}

      {messages.length === 0 && !streaming && !fetchErr && <EmptyState message="공고 1개와 이력서 1개를 고르세요" />}

      {messages.map((m, i) => {
        if (m.role === 'USER') return <p key={i} className={styles.user}>{m.content}</p>;
        const isLast = i === messages.length - 1;
        return (
          <div key={i} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>✨ GAP 분석</h3>
              {m.stopped ? <span className={styles.badgeStopped}>중단됨</span>
                : isLast && streaming ? <span className={styles.badgeStreaming}>생성 중…</span>
                : <span className={styles.badgeDone}>완료</span>}
            </div>
            <ReportText text={m.content} />
            <SourceChips sources={m.sources} />
            {m.stopped && (
              <div className={styles.abortedAlert}>
                생성을 중단했습니다. 여기까지의 답변은 화면에만 남고 기록에는 저장되지 않습니다.
              </div>
            )}
          </div>
        );
      })}

      {streaming && (
        <div className={styles.streamingControl}>
          <LoadingSpinner label="AI가 분석 리포트를 생성하고 있어요…" />
          <button type="button" className={styles.stopBtn} onClick={stop}>중단</button>
        </div>
      )}

      {error && <ErrorMessage error={error} onRetry={() => {}} />}

      {activeId && (
        <FollowUpForm
          disabled={streaming}
          onSubmit={(question) => start({ analysisId: activeId, question })}
        />
      )}
    </div>
  );
}
