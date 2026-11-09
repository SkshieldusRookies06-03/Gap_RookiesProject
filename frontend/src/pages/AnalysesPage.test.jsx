import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API, ok, page } from '../test/handlers.js';
import { ROUTES } from '../routes.js';
import AnalysesPage from './AnalysesPage.jsx';

describe('[FE-화면 T-031] 분석 기록 화면', () => {
  it('INCOMPLETE 분석 행에는 "중단됨" 배지가 보이고, 클릭 시 상세 화면으로 이동한다', async () => {
    const mockAnalyses = [
      {
        id: '7',
        title: '카카오 공고 × 이력서',
        postingTitle: '카카오 공고',
        resumeTitle: '이력서',
        messageCount: 3,
        lastStatus: 'INCOMPLETE',
        createdAt: '2026-11-06T10:00:00+09:00',
      },
    ];
    server.use(http.get(`${API}/api/analyses`, () => HttpResponse.json(ok(page(mockAnalyses)))));

    render(
      <MemoryRouter initialEntries={[ROUTES.ANALYSES]}>
        <Routes>
          <Route path={ROUTES.ANALYSES} element={<AnalysesPage />} />
          <Route path={ROUTES.ANALYSIS} element={<div>분석 상세 7</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('카카오 공고 × 이력서')).toBeInTheDocument();
    expect(screen.getByText('중단됨')).toBeInTheDocument();

    fireEvent.click(screen.getByText('카카오 공고 × 이력서'));
    expect(await screen.findByText('분석 상세 7')).toBeInTheDocument();
  });

  it('빈 목록일 때 "아직 분석이 없습니다" 문구와 새 분석 링크가 노출된다', async () => {
    server.use(http.get(`${API}/api/analyses`, () => HttpResponse.json(ok(page([])))));

    render(
      <MemoryRouter initialEntries={[ROUTES.ANALYSES]}>
        <Routes>
          <Route path={ROUTES.ANALYSES} element={<AnalysesPage />} />
          <Route path={ROUTES.ANALYSIS_NEW} element={<div>새 분석 화면</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('아직 분석이 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '새 분석' })).toBeInTheDocument();
  });
});
