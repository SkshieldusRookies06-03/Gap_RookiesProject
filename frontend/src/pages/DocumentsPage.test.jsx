import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API, fail, ok, page, sampleDocs } from '../test/handlers.js';
import DocumentsPage from './DocumentsPage.jsx';

// 판정 테스트 — 기술 리드 작성 · 팀장(T-021)이 green으로 만든다 · 이 파일은 고치지 않는다
const renderPage = () => render(<MemoryRouter><DocumentsPage /></MemoryRouter>);

describe('[팀장 T-021] 내 문서 화면 — 상태 넷 (SPEC §5)', () => {
  it('로딩 — 응답 전에는 role=status', async () => {
    server.use(http.get(`${API}/api/documents`, async () => { await new Promise((r) => setTimeout(r, 200)); return HttpResponse.json(ok(page([]))); }));
    renderPage();
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('빈 — "공고나 이력서를 올려 보세요"', async () => {
    server.use(http.get(`${API}/api/documents`, () => HttpResponse.json(ok(page([])))));
    renderPage();
    expect(await screen.findByText('공고나 이력서를 올려 보세요')).toBeInTheDocument();
  });

  it('에러 — role=alert + 사용자용 문구(서버 message를 그대로 내지 않는다 · F-7)', async () => {
    server.use(http.get(`${API}/api/documents`, () => HttpResponse.json({ ...fail(500, 'INTERNAL_SERVER_ERROR'), message: 'java.lang.NullPointerException' }, { status: 500 })));
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).not.toContain('NullPointerException');
  });

  it('정상 — 제목이 보이고, 제목 속 HTML은 텍스트로 렌더된다(F-1)', async () => {
    server.use(http.get(`${API}/api/documents`, () => HttpResponse.json(ok(page([
      ...sampleDocs,
      { id: '16', type: 'RESUME', title: '<img src=x onerror=alert(1)>', charCount: 1, createdAt: sampleDocs[0].createdAt },
    ])))));
    const { container } = renderPage();
    expect(await screen.findByText('카카오 백엔드 신입 공고')).toBeInTheDocument();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
