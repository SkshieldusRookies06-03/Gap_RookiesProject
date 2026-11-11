import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { ROUTES } from '../routes.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import styles from './Analyses.module.css';

function ChevronRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.chevronIcon}
      aria-hidden="true"
    >
      <path
        d="M7.5 5L12.5 10L7.5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatAnalysisDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      return isoStr.slice(0, 10).replace(/-/g, '.');
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  } catch {
    return isoStr.slice(0, 10).replace(/-/g, '.');
  }
}

function AnalysisRow({ item, onClick }) {
  const isStopped = item.lastStatus === 'INCOMPLETE';
  const dateStr = formatAnalysisDate(item.createdAt);
  const msgCountStr = `메시지 ${item.messageCount ?? 0}`;

  return (
    <li
      className={styles.row}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <div className={styles.textArea}>
        <p className={styles.title}>{item.title}</p>

        <div className={styles.docsArea}>
          <span className={`${styles.badge} ${styles.badgePosting}`}>공고</span>
          <span className={styles.docTitle}>
            {item.postingTitle || item.title}
          </span>

          {item.resumeTitle && (
            <>
              <span className={`${styles.badge} ${styles.badgeResume}`}>이력서</span>
              <span className={styles.docTitle}>{item.resumeTitle}</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.metaCol}>
        <div className={styles.statusCol}>
          {isStopped && (
            <span className={`${styles.badge} ${styles.badgeStopped}`}>중단됨</span>
          )}
        </div>
        <span className={styles.messageCount}>{msgCountStr}</span>
        <span className={styles.metaDivider}>·</span>
        <span className={styles.date}>{dateStr}</span>
      </div>

      <ChevronRightIcon />
    </li>
  );
}

AnalysisRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    postingTitle: PropTypes.string,
    resumeTitle: PropTypes.string,
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
      <button
        type="button"
        className={styles.pageBtn}
        disabled={pageInfo?.first ?? true}
        onClick={onPrev}
      >
        이전
      </button>
      <span className={styles.pageText}>
        {current} / {total}
      </span>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={pageInfo?.last ?? true}
        onClick={onNext}
      >
        다음
      </button>
    </nav>
  );
}

Pager.propTypes = {
  pageInfo: PropTypes.shape({
    number: PropTypes.number,
    totalPages: PropTypes.number,
    first: PropTypes.bool,
    last: PropTypes.bool,
  }),
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
};

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

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  return (
    <div className={styles.container}>
      <header className={styles.pageHeading}>
        <div className={styles.pageTitles}>
          <h1 className={styles.pageTitle}>분석 기록</h1>
          <p className={styles.pageDescription}>
            지난 분석을 최신순으로 보여 줍니다 · 행을 누르면 대화를 이어 갈 수 있어요
          </p>
        </div>
        {!loading && !error && data?.content?.length > 0 && (
          <Link to={ROUTES.ANALYSIS_NEW} className={styles.newBtn}>
            새 분석
          </Link>
        )}
      </header>

      {loading && <LoadingSpinner />}
      {!loading && error && (
        <ErrorMessage error={error} onRetry={fetchAnalyses} />
      )}
      {!loading && !error && data?.content?.length === 0 && (
        <EmptyState
          message="아직 분석이 없습니다"
          action={<Link to={ROUTES.ANALYSIS_NEW}>새 분석</Link>}
        />
      )}
      {!loading && !error && data?.content?.length > 0 && (
        <>
          <ul className={styles.list}>
            {data.content.map((item) => (
              <AnalysisRow
                key={item.id}
                item={item}
                onClick={() => navigate(ROUTES.analysis(item.id))}
              />
            ))}
          </ul>
          <Pager
            pageInfo={data.page}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  );
}
