import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api/client.js';
import { useUpload } from '../hooks/useUpload.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage, { messageFor } from '../components/ErrorMessage.jsx';
import styles from './Documents.module.css';

const SORTS = [
  ['createdAt,desc', '최신순'],
  ['createdAt,asc', '오래된순'],
  ['title,asc', '제목 가나다'],
  ['title,desc', '제목 역순'],
];

const TABS = [
  { label: '전체', value: null },
  { label: '공고', value: 'JOB_POSTING' },
  { label: '이력서', value: 'RESUME' },
];

function listPath({ type, page, sort }) {
  const q = new URLSearchParams({
    page: String(page),
    size: '20',
    sort,
  });

  if (type) q.set('type', type);

  return `/api/documents?${q}`;
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = isoStr.slice(0, 10).replace(/-/g, '.');
  return d;
}

/* 문서 업로드 폼 */
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

      setFile(null);
      setTitle('');

      if (fileRef.current) {
        fileRef.current.value = '';
      }

      onUploaded();
    } catch {
      // 오류는 useUpload에서 관리
    }
  };

  return (
    <section className={styles.uploadCard} aria-labelledby="upload-heading">
      <h2 id="upload-heading" className={styles.sectionTitle}>
        문서 올리기
      </h2>

      <form className={styles.uploadForm} onSubmit={handleSubmit}>
        <div className={styles.uploadFields}>
          <div className={`${styles.uploadField} ${styles.typeField}`}>
            <label htmlFor="document-type" className={styles.fieldLabel}>
              문서 종류
            </label>
            <select
              id="document-type"
              className={styles.selectControl}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="JOB_POSTING">채용공고</option>
              <option value="RESUME">이력서</option>
            </select>
          </div>

          <div className={`${styles.uploadField} ${styles.titleField}`}>
            <label htmlFor="document-title" className={styles.fieldLabel}>
              제목
            </label>
            <input
              id="document-title"
              className={styles.fieldControl}
              type="text"
              placeholder="문서 제목 (1~100자)"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={`${styles.uploadField} ${styles.fileField}`}>
            <label htmlFor="document-file" className={styles.fieldLabel}>
              파일
            </label>
            <div className={styles.fileBox}>
              <button
                type="button"
                className={styles.fileSelectBtn}
                onClick={() => fileRef.current?.click()}
              >
                파일 선택
              </button>
              <span className={styles.fileName}>
                {file ? file.name : ''}
              </span>
              <input
                ref={fileRef}
                id="document-file"
                className={styles.hiddenFileInput}
                type="file"
                accept=".md,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.uploadSubmitBtn}
            disabled={uploading}
          >
            {uploading ? '올리는 중…' : '올리기'}
          </button>
        </div>

        <p className={styles.uploadHelpText}>
          .md 또는 .txt(UTF-8) · 200KB 이하 · 제목 최대 100자 · 파일 원본은 저장하지 않고 본문 텍스트만 저장됩니다
        </p>

        {error && (
          <p className={styles.formError} role="alert">
            {messageFor(error)}
          </p>
        )}
      </form>
    </section>
  );
}

UploadForm.propTypes = {
  onUploaded: PropTypes.func.isRequired,
};

/* 문서 종류 및 정렬 툴바 */
function Toolbar({ type, sort, onTypeChange, onSortChange }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.tabs} role="group" aria-label="문서 종류 필터">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            className={`${styles.tab} ${
              type === t.value ? styles.tabActive : ''
            }`}
            aria-pressed={type === t.value}
            onClick={() => onTypeChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.sortControl}>
        <label htmlFor="document-sort" className={styles.sortLabel}>
          정렬
        </label>
        <select
          id="document-sort"
          className={styles.selectControl}
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="문서 정렬"
        >
          {SORTS.map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

Toolbar.propTypes = {
  type: PropTypes.string,
  sort: PropTypes.string.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
};

/* 문서 한 행 / 모바일 카드 */
function DocumentRow({ doc, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    try {
      setErr(null);
      const saved = await api.put(`/api/documents/${doc.id}`, {
        title: title.trim(),
      });

      onSaved(saved);
      setEditing(false);
    } catch (e) {
      setErr(e);
    }
  };

  const remove = async () => {
    try {
      setErr(null);
      await api.del(`/api/documents/${doc.id}`);
      onDeleted(doc.id);
    } catch (e) {
      setErr(e);
      setConfirming(false);
    }
  };

  const isJob = doc.type === 'JOB_POSTING';
  const badgeLabel = isJob ? '공고' : '이력서';
  const badgeClass = isJob ? styles.badgeJob : styles.badgeResume;
  const countText = `${(doc.charCount ?? 0).toLocaleString()}자`;
  const dateText = formatDate(doc.createdAt);

  return (
    <tr
      className={`${styles.documentRow} ${
        confirming ? styles.documentRowConfirming : ''
      }`}
    >
      {/* 1. 태블릿/데스크톱용 종류 셀 */}
      <td className={styles.typeCell} data-label="종류">
        <span className={`${styles.documentBadge} ${badgeClass}`}>
          {badgeLabel}
        </span>
      </td>

      {/* 2. 제목 셀 (수정 모드 또는 모바일 메타 포함) */}
      <td className={styles.titleCell} data-label="제목">
        {editing ? (
          <div className={styles.titleCol}>
            <input
              className={styles.editInput}
              value={title}
              maxLength={100}
              aria-label="문서 제목 수정"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        ) : (
          <div className={styles.titleCol}>
            <span className={styles.documentTitle}>{doc.title}</span>
            {confirming && (
              <p className={styles.deleteWarning}>
                삭제하면 이 문서를 쓴 분석도 지워집니다
              </p>
            )}
          </div>
        )}

        {/* 모바일 전용 메타 정보 (태블릿 이상에서는 숨김) */}
        <div className={styles.mobileMeta}>
          <span className={`${styles.documentBadge} ${badgeClass}`}>
            {badgeLabel}
          </span>
          <span className={styles.mobileMetaText}>
            {countText} · {dateText}
          </span>
        </div>

        {err && (
          <p className={styles.formError} role="alert">
            {messageFor(err)}
          </p>
        )}
      </td>

      {/* 3. 태블릿/데스크톱용 글자 수 셀 */}
      <td className={styles.metaCountCell} data-label="글자 수">
        {countText}
      </td>

      {/* 4. 태블릿/데스크톱용 등록일 셀 */}
      <td className={styles.metaDateCell} data-label="등록일">
        {dateText}
      </td>

      {/* 5. 관리 액션 셀 */}
      <td className={styles.actionsCell} data-label="관리">
        {editing ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btnSm} ${styles.btnPrimary}`}
              disabled={!title.trim()}
              onClick={save}
            >
              저장
            </button>
            <button
              type="button"
              className={`${styles.btnSm} ${styles.btnSecondary}`}
              onClick={() => {
                setEditing(false);
                setTitle(doc.title);
                setErr(null);
              }}
            >
              취소
            </button>
          </div>
        ) : confirming ? (
          <div className={styles.actions} role="alertdialog">
            <button
              type="button"
              className={`${styles.btnSm} ${styles.btnDanger}`}
              onClick={remove}
            >
              삭제 확인
            </button>
            <button
              type="button"
              className={`${styles.btnSm} ${styles.btnSecondary}`}
              onClick={() => setConfirming(false)}
            >
              취소
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btnSm} ${styles.btnSecondary}`}
              onClick={() => setEditing(true)}
            >
              제목 수정
            </button>
            <button
              type="button"
              className={`${styles.btnSm} ${styles.btnSecondary}`}
              onClick={() => setConfirming(true)}
            >
              삭제
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

DocumentRow.propTypes = {
  doc: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    charCount: PropTypes.number,
    createdAt: PropTypes.string,
  }).isRequired,
  onSaved: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
};

/* 문서 목록 테이블 */
function DocumentList({ documents, onSaved, onDeleted }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.thType}>
              종류
            </th>
            <th scope="col" className={styles.thTitle}>
              제목
            </th>
            <th scope="col" className={styles.thCount}>
              글자 수
            </th>
            <th scope="col" className={styles.thDate}>
              등록일
            </th>
            <th scope="col" className={styles.thActions}>
              관리
            </th>
          </tr>
        </thead>

        <tbody>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

DocumentList.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  onSaved: PropTypes.func.isRequired,
  onDeleted: PropTypes.func.isRequired,
};

/* 페이지네이션 */
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

/* 내 문서 페이지 */
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

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleSaved = (saved) => {
    setDocs((prev) =>
      prev
        ? {
            ...prev,
            content: prev.content.map((d) =>
              d.id === saved.id ? saved : d
            ),
          }
        : prev
    );
  };

  const handleDeleted = () => {
    if (docs?.content?.length === 1 && page > 0) {
      setPage((p) => p - 1);
    } else {
      fetchDocs();
    }
  };

  const handleUploaded = () => {
    if (page !== 0) {
      setPage(0);
    } else {
      fetchDocs();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>내 문서</h1>
        <p className={styles.pageDescription}>
          채용공고와 이력서를 올리고 관리합니다
        </p>
      </header>

      <UploadForm onUploaded={handleUploaded} />

      <section className={styles.documentSection} aria-label="문서 목록">
        <Toolbar
          type={type}
          sort={sort}
          onTypeChange={(t) => {
            setType(t);
            setPage(0);
          }}
          onSortChange={(s) => {
            setSort(s);
            setPage(0);
          }}
        />

        {loading && <LoadingSpinner />}

        {!loading && error && (
          <ErrorMessage error={error} onRetry={fetchDocs} />
        )}

        {!loading && !error && docs?.content?.length === 0 && (
          <EmptyState message="공고나 이력서를 올려 보세요" />
        )}

        {!loading && !error && docs?.content?.length > 0 && (
          <>
            <DocumentList
              documents={docs.content}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />

            <Pager
              pageInfo={docs.page}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </section>
    </div>
  );
}
