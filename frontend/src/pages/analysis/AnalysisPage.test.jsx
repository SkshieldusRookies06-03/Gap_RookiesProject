import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { API, fail, ok, page, sampleDocs, sseResponse, ts } from '../../test/handlers.js';
import { ROUTES } from '../../routes.js';
import AnalysisPage from './AnalysisPage.jsx';

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

/** /analyses/new에서 시작 — 종류별 문서 목록 · 두 라우트 모두 같은 AnalysisPage */
function renderNew() {
  server.use(http.get(`${API}/api/documents`, ({ request }) => {
    const type = new URL(request.url).searchParams.get('type');
    return HttpResponse.json(ok(page(sampleDocs.filter((d) => d.type === type))));
  }));
  render(
    <MemoryRouter initialEntries={[ROUTES.ANALYSIS_NEW]}>
      <Routes>
        <Route path={ROUTES.ANALYSIS_NEW} element={<AnalysisPage />} />
        <Route path={ROUTES.ANALYSIS} element={<AnalysisPage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

async function pickAndStart() {
  fireEvent.change(await screen.findByRole('combobox', { name: /채용공고/ }), { target: { value: '12' } });
  fireEvent.change(screen.getByRole('combobox', { name: /이력서/ }), { target: { value: '15' } });
  fireEvent.click(screen.getByRole('button', { name: '분석 시작' }));
}

describe('[FE-분석 T-030] 분석 화면', () => {
  it('L-1: analysis 직후 error로 바로 끝나도 주소를 /analyses/:id로 바꾸고 다시 불러오지 않는다', async () => {
    let reloads = 0;
    server.use(
      http.post(`${API}/api/analyses/stream`, () => sseResponse([
        ['analysis', '{"analysisId":"41"}'],
        ['error', JSON.stringify(fail(503, 'AI_UNAVAILABLE', '분석 서버가 응답하지 않습니다'))],
      ], { splitAt: 4096 })),   // 두 이벤트가 한 조각으로 — 렌더 전에 streaming이 이미 false가 되는 경우

      http.get(`${API}/api/analyses/41/messages`, () => { reloads += 1; return HttpResponse.json(ok(page([]))); }),
    );
    renderNew();
    await pickAndStart();

    expect(await screen.findByText('분석 서버가 응답하지 않습니다')).toBeInTheDocument();
    await screen.findByText(ROUTES.analysis('41'));
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeEnabled();
    expect(reloads).toBe(0);   // 방금 만든 분석 — 실패 화면을 GET messages로 덮지 않는다
  });

  it('L-2: 첫 토큰 전에 중단하면 빈 카드 대신 중단 안내만 보인다', async () => {
    server.use(http.post(`${API}/api/analyses/stream`, ({ request }) => {
      const enc = new TextEncoder();
      const stream = new ReadableStream({
        start(c) {
          c.enqueue(enc.encode('event:analysis\ndata:{"analysisId":"42"}\n\n'));
          request.signal.addEventListener('abort', () => c.error(new DOMException('Aborted', 'AbortError')));
        },
      });
      return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });
    }));
    renderNew();
    await pickAndStart();

    fireEvent.click(await screen.findByRole('button', { name: '중단' }));
    expect(await screen.findByText(/답변이 시작되기 전에 중단했습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '중단' })).not.toBeInTheDocument();
  });

  it('기록에서 /analyses/:id로 다시 들어오면 GET messages로 지난 대화가 보인다', async () => {
    const past = [
      { id: '30', role: 'USER', content: '갭 분석 리포트', sources: [], createdAt: ts },
      { id: '31', role: 'ASSISTANT', content: '지난 리포트 본문입니다', sources: [], createdAt: ts },
      { id: '32', role: 'USER', content: '부족한 것 중 뭐부터 공부해?', sources: [], createdAt: ts },
    ];
    server.use(http.get(`${API}/api/analyses/7/messages`, () => HttpResponse.json(ok(page(past)))));

    render(
      <MemoryRouter initialEntries={[ROUTES.analysis('7')]}>
        <Routes>
          <Route path={ROUTES.ANALYSIS} element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('지난 리포트 본문입니다')).toBeInTheDocument();
    expect(screen.getByText('부족한 것 중 뭐부터 공부해?')).toBeInTheDocument();
    expect(screen.getByText('답변 없음(중단됨)')).toBeInTheDocument();      // 마지막이 USER — 답변이 저장되지 않은 질문
    expect(screen.getByRole('textbox', { name: '후속 질문' })).toBeInTheDocument();   // hydrate가 analysisId를 넣어 이어 쓸 수 있다
  });
});
