import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { API, ok, page, ts } from '../../test/handlers.js';
import { ROUTES } from '../../routes.js';
import AnalysisPage from './AnalysisPage.jsx';

describe('[FE-분석 T-030] 분석 화면', () => {
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
