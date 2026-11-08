import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api/client.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import styles from './Documents.module.css';

const SORTS = [['createdAt,desc', '최신순'], ['createdAt,asc', '오래된순'], ['title,asc', '제목 가나다'], ['title,desc', '제목 역순']];
const TABS = [{ label: '전체', value: null }, { label: '공고', value: 'JOB_POSTING' }, { label: '이력서', value: 'RESUME' }];

function listPath({ type, page, sort }) {
  const q = new URLSearchParams({ page: String(page), size: '20', sort });
  if (type) q.set('type', type);
  return `/api/documents?${q}`;
}

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

function DocumentRow({ doc }) {
  const badge = doc.type === 'JOB_POSTING' ? '공고' : '이력서';
  return (
    <li className={styles.row}>
      <div className={styles.info}>
        <span className={styles.badge}>{badge}</span>
        <span className={styles.title}>{doc.title}</span>
      </div>
      <div className={styles.meta}>
        <span>{doc.charCount?.toLocaleString() ?? 0}자</span>
        <span>{doc.createdAt ? doc.createdAt.slice(0, 10) : ''}</span>
      </div>
    </li>
  );
}
DocumentRow.propTypes = {
  doc: PropTypes.shape({ id: PropTypes.string.isRequired, type: PropTypes.string.isRequired, title: PropTypes.string.isRequired, charCount: PropTypes.number, createdAt: PropTypes.string }).isRequired,
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
    try {
      setDocs(await api.get(listPath({ type, page, sort })));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [type, page, sort]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  return (
    <div className={styles.container}>
      <Toolbar type={type} sort={sort} onTypeChange={(t) => { setType(t); setPage(0); }} onSortChange={(s) => { setSort(s); setPage(0); }} />
      {loading && <LoadingSpinner />}
      {!loading && error && <ErrorMessage error={error} onRetry={fetchDocs} />}
      {!loading && !error && docs?.content?.length === 0 && <EmptyState message="공고나 이력서를 올려 보세요" />}
      {!loading && !error && docs?.content?.length > 0 && (
        <>
          <ul className={styles.list}>
            {docs.content.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
          </ul>
          <Pager pageInfo={docs.page} onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => p + 1)} />
        </>
      )}
    </div>
  );
}
