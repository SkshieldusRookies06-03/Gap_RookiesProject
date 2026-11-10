import PropTypes from 'prop-types';
import styles from './SourceChips.module.css';
import iconPosting from './SourceChips-icon-posting.svg';
import iconResume from './SourceChips-icon-resume.svg';
import iconWeb from './SourceChips-icon-web.svg';
import iconWebText from './SourceChips-icon-webtext.svg';
import iconExternal from './SourceChips-icon-external.svg';

const DOC = {
  JOB_POSTING: { label: '공고', icon: iconPosting },
  RESUME: { label: '이력서', icon: iconResume },
};
const PREVIEW = 24;   // 디자인 SourceChip: chunk 앞 24자 · 전체는 title(마우스 오버)

/** http(s)만 링크로 — javascript:·data: 같은 스킴과 잘못된 주소는 null (점검서 F-1) */
function safeHref(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

const Icon = ({ src }) => <img className={styles.icon} src={src} alt="" width="14" height="14" />;
Icon.propTypes = { src: PropTypes.string.isRequired };

function WebChip({ source }) {
  const href = safeHref(source.url);
  const title = source.title || source.url || '웹 출처';
  return (
    <li className={styles.chip}>
      {href ? (
        <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer" title={title}>
          <Icon src={iconWeb} />
          <span className={styles.text}>웹 · {title}</span>
          <Icon src={iconExternal} />
        </a>
      ) : (
        <>
          <Icon src={iconWebText} />
          <span className={`${styles.text} ${styles.muted}`} title={title}>웹 · {title}</span>
        </>
      )}
    </li>
  );
}
WebChip.propTypes = {
  source: PropTypes.shape({ url: PropTypes.string, title: PropTypes.string }).isRequired,
};

function DocChip({ source }) {
  const doc = DOC[source.docType] ?? { label: source.docType ?? '문서', icon: iconPosting };
  const chunk = String(source.chunk ?? '').replace(/\s+/g, ' ').trim();
  const preview = chunk.length > PREVIEW ? `${chunk.slice(0, PREVIEW)}…` : chunk;
  return (
    <li className={styles.chip} title={source.chunk}>
      <Icon src={doc.icon} />
      <span className={styles.text}>{preview ? `${doc.label} · ${preview}` : doc.label}</span>
    </li>
  );
}
DocChip.propTypes = {
  source: PropTypes.shape({ docType: PropTypes.string, chunk: PropTypes.string }).isRequired,
};

/** 분석 출처 칩 (오너: 기술 리드 · 디자인 SourceChip) — 문서/웹을 구분한다. 출처가 없으면 그리지 않는다. */
export default function SourceChips({ sources = [] }) {
  if (!sources?.length) return null;
  return (
    <section className={styles.sources} aria-label="출처">
      <p className={styles.label}>출처</p>
      <ul className={styles.chips}>
        {sources.map((source, i) => (source.type === 'web'
          ? <WebChip key={i} source={source} />
          : <DocChip key={i} source={source} />))}
      </ul>
    </section>
  );
}
SourceChips.propTypes = { sources: PropTypes.arrayOf(PropTypes.object) };
