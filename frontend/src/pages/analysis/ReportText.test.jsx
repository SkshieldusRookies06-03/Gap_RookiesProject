import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ReportText from './ReportText.jsx';
import SourceChips from './SourceChips.jsx';

// 판정 테스트 — 기술 리드 작성 · T-054(ReportText·SourceChips)가 green으로 만든다 · 이 파일은 고치지 않는다
// 계약: SPEC §5 "응답은 ReportText로 렌더(제목·표·목록만 요소로, HTML은 글자로 · dangerouslySetInnerHTML 금지)"
//       · onboarding/FA §3.3 `<ReportText text={m.content} />` `<SourceChips sources={m.sources} />` · 점검서 F-1

const REPORT = [
  '## 요구 기술',
  '| 기술 | 공고 근거 | 보유 여부 | 이력서 근거 |',
  '|---|---|---|---|',
  '| Spring Boot | 자격요건 | 보유 | 쇼핑몰 프로젝트 |',
  '| Kubernetes | 우대사항 | 없음 | - |',
  '',
  '## 준비 순서',
  '1. Docker 기초',
  '2. Kubernetes 배포 실습',
  '',
  '- 참고: 공고는 신입 대상',
].join('\n');

describe('[기술 리드 T-054] 응답 안전 렌더 — ReportText · SourceChips (SPEC §5 · F-1)', () => {
  it('리포트의 제목·표·목록을 요소로 그린다 (기본 리포트 형식 SPEC §4.3)', () => {
    render(<ReportText text={REPORT} />);
    expect(screen.getByRole('heading', { name: '요구 기술' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '준비 순서' })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: '보유 여부' })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);                 // 헤더 1 + 본문 2 (구분선 |---| 은 행이 아니다)
    expect(within(table).getByRole('cell', { name: 'Kubernetes' })).toBeInTheDocument();

    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(expect.arrayContaining(['Docker 기초', 'Kubernetes 배포 실습', '참고: 공고는 신입 대상']));
    expect(screen.queryByText(/^## /)).toBeNull();                              // 마크다운 기호가 글자로 남지 않는다
  });

  it('응답 속 HTML·스크립트는 요소가 아니라 글자로 보인다 — 표 칸 안에서도 (F-1)', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const { container } = render(<ReportText text={`## 결과\n${evil}\n| 기술 | 비고 |\n|---|---|\n| <script>alert(2)</script> | <b>굵게</b> |`} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText(evil, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '<script>alert(2)</script>' })).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/<img|<script|<b>/);
  });

  it('스트리밍 중 덜 온 마크다운(표 머리만 · 줄 중간)도 깨지지 않고 글자를 잃지 않는다', () => {
    const partials = ['', '## 요', '## 요구 기술\n| 기술 | 보', '## 요구 기술\n| 기술 | 보유 |\n|---', '1. Dock'];
    for (const text of partials) {
      const { container, unmount } = render(<ReportText text={text} />);
      const visible = container.textContent.replace(/\s+/g, '');
      const expected = text.replace(/^#+\s*/gm, '').replace(/^\d+\.\s*/gm, '').replace(/[|\-\s]/g, '');
      for (const ch of expected) expect(visible, `"${text}"`).toContain(ch);
      unmount();
    }
  });

  it('SourceChips — doc/web을 구분하고 웹은 http(s)만 새 탭 링크(noopener) · 그 밖 스킴은 링크로 만들지 않는다', () => {
    const sources = [
      { type: 'doc', documentId: '12', docType: 'JOB_POSTING', chunk: '우대: Kubernetes', score: 0.82 },
      { type: 'web', url: 'https://example.com/news', title: '기업 기술 블로그' },
      { type: 'web', url: 'javascript:alert(1)', title: '수상한 링크' },
      { type: 'web', url: 'data:text/html,<script>alert(1)</script>', title: '데이터 링크' },
    ];
    const { container } = render(<SourceChips sources={sources} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);                                              // 정상 웹 출처 하나만 링크
    expect(links[0]).toHaveAttribute('href', 'https://example.com/news');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0].getAttribute('rel')).toMatch(/noopener/);
    expect(links[0].getAttribute('rel')).toMatch(/noreferrer/);
    expect(links[0]).toHaveTextContent('기업 기술 블로그');

    expect(screen.getByText(/수상한 링크/)).toBeInTheDocument();                 // 링크는 아니어도 출처 이름은 보인다
    expect(container.querySelector('a[href^="javascript:"], a[href^="data:"]')).toBeNull();
    expect(container.textContent).toMatch(/공고|JOB_POSTING/);                  // doc 칩은 문서 종류를 알 수 있다
    expect(render(<SourceChips sources={[]} />).container.querySelectorAll('a')).toHaveLength(0);
  });
});
