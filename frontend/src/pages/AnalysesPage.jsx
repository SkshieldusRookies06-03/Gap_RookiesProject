import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { ROUTES } from '../routes.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import styles from './Analyses.module.css';

function AnalysisRow({ item, onClick }) {
  return (
    <li className={styles.row} onClick={onClick}>
      <div className={styles.info}>
        <span className={styles.title}>{item.title}</span>
        {item.lastStatus === 'INCOMPLETE' && <span className={styles.badgeDanger}>중단됨</span>}
      </div>
      <div className={styles.meta}>
        <span>메시지 {item.messageCount ?? 0}</span>
        <span>{item.createdAt ? item.createdAt.slice(0, 10) : ''}</span>
      </div>
    </li>
  );
}
AnalysisRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    messageCount: PropTypes.number,
    lastStatus: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
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

export default function AnalysesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get(`/api/analyses?page=${page}&size=20`));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  return (
    <div className={styles.container}>
      {loading && <LoadingSpinner />}
      {!loading && error && <ErrorMessage error={error} onRetry={fetchAnalyses} />}
      {!loading && !error && data?.content?.length === 0 && (
        <EmptyState message="아직 분석이 없습니다" action={<Link to={ROUTES.ANALYSIS_NEW}>새 분석</Link>} />
      )}
      {!loading && !error && data?.content?.length > 0 && (
        <>
          <ul className={styles.list}>
            {data.content.map((item) => (
              <AnalysisRow key={item.id} item={item} onClick={() => navigate(ROUTES.analysis(item.id))} />
            ))}
          </ul>
          <Pager pageInfo={data.page} onPrev={() => setPage((p) => Math.max(0, p - 1))} onNext={() => setPage((p) => p + 1)} />
        </>
      )}
    </div>
  );
}
