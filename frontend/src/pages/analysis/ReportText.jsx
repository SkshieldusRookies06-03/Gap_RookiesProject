import PropTypes from 'prop-types';
import styles from './ReportText.module.css';

const HEADING = /^(#{1,6})\s+(.*)$/;
const ORDERED = /^\s*(\d+)\.\s+(.*)$/;
const BULLET = /^\s*-\s+(.*)$/;
const TABLE_ROW = /^\s*\|/;
const TABLE_RULE = /^\s*\|[\s:|-]*-[\s:|-]*$/;

const isTableStart = (lines, i) => TABLE_ROW.test(lines[i]) && TABLE_RULE.test(lines[i + 1] ?? '');
const startsBlock = (lines, i) =>
  !lines[i].trim() || HEADING.test(lines[i]) || ORDERED.test(lines[i]) || BULLET.test(lines[i]) || isTableStart(lines, i);

const toCells = (line) =>
  line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

/** 마크다운 일부를 블록 목록으로 나눈다 — 표는 구분선이 온 뒤에만 표가 되고, 그 전까지는 글자 그대로 문단이다. */
function parseBlocks(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const blocks = [];
  let i = 0;
  const takeWhile = (pattern) => {
    const taken = [];
    while (i < lines.length && pattern.test(lines[i])) taken.push(lines[i++]);
    return taken;
  };
  while (i < lines.length) {
    const heading = lines[i].match(HEADING);
    if (!lines[i].trim()) {
      i += 1;
    } else if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      i += 1;
    } else if (ORDERED.test(lines[i])) {
      const items = takeWhile(ORDERED).map((l) => l.match(ORDERED));
      blocks.push({ kind: 'ordered', start: Number(items[0][1]), items: items.map((m) => m[2]) });
    } else if (BULLET.test(lines[i])) {
      blocks.push({ kind: 'bullet', items: takeWhile(BULLET).map((l) => l.match(BULLET)[1]) });
    } else if (isTableStart(lines, i)) {
      const head = toCells(lines[i]);
      i += 2;
      blocks.push({ kind: 'table', head, rows: takeWhile(TABLE_ROW).map(toCells) });
    } else {
      const start = i;
      i += 1;
      while (i < lines.length && !startsBlock(lines, i)) i += 1;
      blocks.push({ kind: 'paragraph', text: lines.slice(start, i).join('\n') });
    }
  }
  return blocks;
}

function renderBlock(block, key) {
  const listItems = () => block.items.map((item, i) => <li key={i}>{item}</li>);
  switch (block.kind) {
    case 'heading': {
      const Tag = `h${block.level}`;
      return <Tag key={key} className={styles.heading}>{block.text}</Tag>;
    }
    case 'ordered':
      return <ol key={key} className={styles.list} start={block.start}>{listItems()}</ol>;
    case 'bullet':
      return <ul key={key} className={styles.list}>{listItems()}</ul>;
    case 'table':
      return (
        <div key={key} className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>{block.head.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
            <tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    default:
      return <p key={key} className={styles.paragraph}>{block.text}</p>;
  }
}

/** 분석 응답 안전 렌더 (오너: 기술 리드 · 점검서 F-1) — 전부 JSX 텍스트라 응답 속 HTML은 글자로만 보인다. */
export default function ReportText({ text = '' }) {
  return <div className={styles.report}>{parseBlocks(text).map(renderBlock)}</div>;
}
ReportText.propTypes = { text: PropTypes.string };
