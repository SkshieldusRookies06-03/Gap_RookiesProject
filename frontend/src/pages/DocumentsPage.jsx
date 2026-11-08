import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api/client.js';
import { useUpload } from '../hooks/useUpload.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage, { messageFor } from '../components/ErrorMessage.jsx';
import Button from '../components/Button.jsx';
import styles from './Documents.module.css';

const SORTS = [['createdAt,desc', '최신순'], ['createdAt,asc', '오래된순'], ['title,asc', '제목 가나다'], ['title,desc', '제목 역순']];
const TABS = [{ label: '전체', value: null }, { label: '공고', value: 'JOB_POSTING' }, { label: '이력서', value: 'RESUME' }];

function listPath({ type, page, sort }) {
  const q = new URLSearchParams({ page: String(page), size: '20', sort });
  if (type) q.set('type', type);
  return `/api/documents?${q}`;
}

function UploadForm({ onUploaded }) {
  const { upload, uploading, error } = useUpload();
  const [file, setFile] = useState(null);
  const [type, setType] = useState('JOB_POSTING');
  const [title, setTitle] = useState('');
  const fileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await upload({ file, type, title });
      setFile(null); setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      onUploaded();
    } catch { /* useUpload error */ }
  };

  return (
    <form className={styles.uploadForm} onSubmit={handleSubmit}>
      <input ref={fileRef} type="file" accept=".md,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="JOB_POSTING">공고</option>
        <option value="RESUME">이력서</option>
      </select>
      <input type="text" placeholder="문서 제목 (1~100자)" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button type="submit" disabled={uploading}>업로드</Button>
      {error && <p className={styles.formError}>{messageFor(error)}</p>}
    </form>
  );
}
UploadForm.propTypes = { onUploaded: PropTypes.func.isRequired };

function Toolbar({ type, sort, onTypeChange, onSortChange }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t.label} type="button" className={`${styles.tab} ${type === t.value ? styles.tabActive : ''}`} onClick={() => onTypeChange(t.value)}>
            {t.label}
          </button>
        ))}
      </div>
      <select className={styles.select} value={sort} onChange={(e) => onSortChange(e.target.value)}>
        {SORTS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>
    </div>
  );
}
Toolbar.propTypes = { type: PropTypes.string, sort: PropTypes.string.isRequired, onTypeChange: PropTypes.func.isRequired, onSortChange: PropTypes.func.isRequired };

function DocumentRow({ doc, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    try { setErr(null); onSaved(await api.put(`/api/documents/${doc.id}`, { title })); setEditing(false); }
    catch (e) { setErr(e); }
  };
  const remove = async () => {
    try { setErr(null); await api.del(`/api/documents/${doc.id}`); onDeleted(doc.id); }
    catch (e) { setErr(e); setConfirming(false); }
  };

  return (
    <li className={styles.row}>
      <div className={styles.info}>
        <span className={styles.badge}>{doc.type === 'JOB_POSTING' ? '공고' : '이력서'}</span>
        {editing ? <input className={styles.editInput} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /> : <span className={styles.title}>{doc.title}</span>}
      </div>
      <div className={styles.meta}>
        <span>{doc.charCount?.toLocaleString() ?? 0}자</span>
        <span>{doc.createdAt ? doc.createdAt.slice(0, 10) : ''}</span>
      </div>
      <div className={styles.actions}>
        {editing ? (
          <><button type="button" className={styles.btnSm} onClick={save}>저장</button><button type="button" className={styles.btnSm} onClick={() => { setEditing(false); setTitle(doc.title); }}>취소</button></>
        ) : confirming ? (
          <div role="alertdialog" className={styles.dialog}>
            <span>삭제하면 이 문서를 쓴 분석도 지워집니다</span>
            <button type="button" className={styles.btnSm} onClick={remove}>삭제 확인</button>
            <button type="button" className={styles.btnSm} onClick={() => setConfirming(false)}>취소</button>
          </div>
        ) : (
          <><button type="button" className={styles.btnSm} onClick={() => setEditing(true)}>수정</button><button type="button" className={styles.btnSm} onClick={() => setConfirming(true)}>삭제</button></>
        )}
      </div>
      {err && <p className={styles.formError}>{messageFor(err)}</p>}
    </li>
  );
}
DocumentRow.propTypes = {
  doc: PropTypes.shape({ id: PropTypes.string.isRequired, type: PropTypes.string.isRequired, title: PropTypes.string.isRequired, charCount: PropTypes.number, createdAt: PropTypes.string }).isRequired,
  onSaved: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
};

function Pager({ pageInfo, onPrev, onNext }) {
  const current = (pageInfo?.number ?? 0) + 1;
  const total = Math.max(1, pageInfo?.totalPages ?? 1);
  return (
    <nav className={styles.pager} aria-label="페이지 이동">
      <button type="button" className={styles.pageBtn} disabled={pageInfo?.first ?? true} onClick={onPrev}>이전</button>
      <span className={styles.pageText}>{current} / {total}</span>
      <button type="button" className={styles.pageBtn} disabled={pageInfo?.last ?? true} onClick={onNext}>다음</button>
    </nav>
  );
}
Pager.propTypes = { pageInfo: PropTypes.shape({ number: PropTypes.number, totalPages: PropTypes.number, first: PropTypes.bool, last: PropTypes.bool }), onPrev: PropTypes.func.isRequired, onNext: PropTypes.func.isRequired };

export default function DocumentsPage() {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [type, setType] = useState(null);
  const [sort, setSort] = useState('createdAt,desc');
  const [page, setPage] = useState(0);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setDocs(await api.get(listPath({ type, page, sort }))); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [type, page, sort]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleSaved = (saved) => {
    setDocs((prev) => (prev ? { ...prev, content: prev.content.map((d) => (d.id === saved.id ? saved : d)) } : prev));
  };

  const handleDeleted = () => {
    if (docs?.content?.length === 1 && page > 0) setPage((p) => p - 1);
    else fetchDocs();
  };

  return (
    <div className={styles.container}>
      <UploadForm onUploaded={() => { setPage(0); fetchDocs(); }} />
      <Toolbar type={type} sort={sort} onTypeChange={(t) => { setType(t); setPage(0); }} onSortChange={(s) => { setSort(s); setPage(0); }} />
      {loading && <LoadingSpinner />}
      {!loading && error && <ErrorMessage error={error} onRetry={fetchDocs} />}
      {!loading && !error && docs?.content?.length === 0 && <EmptyState message="공고나 이력서를 올려 보세요" />}
      {!loading && !error && docs?.content?.length > 0 && (
        <>
          <ul className={styles.list}>
            {docs.content.map((doc) => <DocumentRow key={doc.id} doc={doc} onSaved={handleSaved} onDeleted={handleDeleted} />)}
          </ul>
          <Pager pageInfo={docs.page} onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => p + 1)} />
        </>
      )}
    </div>
  );
}
