import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { API, ok, page, sampleDocs, sseResponse } from '../../test/handlers.js';
import { ROUTES } from '../../routes.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import AnalysisPage from './AnalysisPage.jsx';

describe('[FE-분석 T-030] AnalysisPage — 피그마 기반 분석 화면 상태 및 후속 질문', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({ accessToken: 'test-token', refreshToken: 'test-refresh', user: { name: '테스터' } });
    useChatStore.getState().reset();
    server.use(
      http.get(`${API}/api/documents`, () => HttpResponse.json(ok(page(sampleDocs))))
    );
  });

  it('새 분석 진입 시 문서 선택 드롭다운과 빈 상태 문구가 보이고, 분석 시작 시 결과를 렌더링한다', async () => {
    const frames = [
      ['analysis', '{"analysisId":"7"}'],
      ['token', '"## 요구 기술\\n| Java | 보유 |"'],
      ['sources', '[{"type":"doc","documentId":"12","docType":"JOB_POSTING","chunk":"요구기술","score":0.9}]'],
      ['done', '{"messageId":"31"}'],
    ];
    server.use(
      http.post(`${API}/api/analyses/stream`, () => sseResponse(frames))
    );

    render(
      <MemoryRouter initialEntries={[ROUTES.ANALYSIS_NEW]}>
        <Routes>
          <Route path={ROUTES.ANALYSIS_NEW} element={<AnalysisPage />} />
          <Route path={ROUTES.ANALYSIS} element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('공고 1개와 이력서 1개를 고르세요')).toBeInTheDocument();
    expect(screen.getByText('채용공고 *')).toBeInTheDocument();
    expect(screen.getByText('이력서 *')).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: '분석 시작' });
    expect(startBtn).toBeDisabled();

    // 공고 및 이력서 선택
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '12' } });
    fireEvent.change(selects[1], { target: { value: '15' } });
    expect(startBtn).not.toBeDisabled();

    // 분석 시작
    fireEvent.click(startBtn);

    // 스트리밍 결과 검증
    expect(await screen.findByText('✨ GAP 분석')).toBeInTheDocument();
    expect(await screen.findByText(/요구 기술/)).toBeInTheDocument();
    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('스트리밍 중 중단 버튼을 누르면 "중단됨" 배지와 피그마 중단 알림 문구가 표시된다', async () => {
    let controllerRef;
    const endlessStream = new ReadableStream({
      start(c) {
        controllerRef = c;
        c.enqueue(new TextEncoder().encode('event:analysis\ndata:{"analysisId":"7"}\n\nevent:token\ndata:"분석 진행 중..."\n\n'));
      },
      cancel() {
        // Stream cancelled on abort
      },
    });
    server.use(
      http.post(`${API}/api/analyses/stream`, () => new HttpResponse(endlessStream, {
        headers: { 'Content-Type': 'text/event-stream' },
      }))
    );

    render(
      <MemoryRouter initialEntries={[ROUTES.ANALYSIS_NEW]}>
        <Routes>
          <Route path={ROUTES.ANALYSIS_NEW} element={<AnalysisPage />} />
          <Route path={ROUTES.ANALYSIS} element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    const selects = await screen.findAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '12' } });
    fireEvent.change(selects[1], { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: '분석 시작' }));

    // 생성 중 및 중단 버튼 표시 확인
    expect(await screen.findByText('AI가 분석 리포트를 생성하고 있어요…')).toBeInTheDocument();
    const stopBtn = screen.getByRole('button', { name: '중단' });

    // 중단 클릭
    fireEvent.click(stopBtn);

    // 중단 결과 반영 확인
    expect(await screen.findByText('중단됨')).toBeInTheDocument();
    expect(screen.getByText('생성을 중단했습니다. 여기까지의 답변은 화면에만 남고 기록에는 저장되지 않습니다.')).toBeInTheDocument();
    if (controllerRef) {
      try { controllerRef.close(); } catch {}
    }
  });

  it('/analyses/:id 로 진입 시 기존 대화 내역(hydrate)과 후속 질문 폼(1000자 제한)이 렌더링된다', async () => {
    const prevMessages = [
      { id: '1', role: 'USER', content: '공고와 이력서 분석해줘', createdAt: '2026-11-06T10:00:00+09:00' },
      { id: '2', role: 'ASSISTANT', content: '## 분석 결과\nSpring Boot 경험 보유', sources: [], createdAt: '2026-11-06T10:00:05+09:00' },
    ];
    server.use(
      http.get(`${API}/api/analyses/7/messages`, () => HttpResponse.json(ok(page(prevMessages))))
    );

    render(
      <MemoryRouter initialEntries={['/analyses/7']}>
        <Routes>
          <Route path="/analyses/:id" element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 이전 대화 렌더링 확인
    expect(await screen.findByText('공고와 이력서 분석해줘')).toBeInTheDocument();
    expect(screen.getByText(/Spring Boot 경험 보유/)).toBeInTheDocument();

    // 후속 질문 폼 및 글자수 카운터 확인
    const textarea = screen.getByPlaceholderText('후속 질문을 입력하세요 (예: 부족한 것부터 뭘 공부해?)');
    expect(textarea).toBeInTheDocument();
    expect(screen.getByText('0 / 1000')).toBeInTheDocument();

    // 질문 입력 시 카운터 갱신 확인
    fireEvent.change(textarea, { target: { value: '어떤 기술부터 공부할까요?' } });
    expect(screen.getByText('14 / 1000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보내기' })).not.toBeDisabled();
  });
});
