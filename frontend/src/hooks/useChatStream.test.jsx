import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { server } from '../test/server.js';
import { API, sseResponse } from '../test/handlers.js';
import { useChatStream } from './useChatStream.js';
import { useAuthStore } from '../stores/authStore.js';

// 판정 테스트 — 기술 리드 작성 · FE-분석(T-022)이 green으로 만든다 · 이 파일은 고치지 않는다
describe('[FE-분석 T-022] useChatStream — SPEC §4.3 이벤트 · §5', () => {
  const frames = [
    ['analysis', '{"analysisId":"7"}'],
    ['token', '"## 요구 기술\\n"'],
    ['token', '"| Kubernetes | 없음 |"'],
    ['sources', '[{"type":"doc","documentId":"12","docType":"JOB_POSTING","chunk":"우대","score":0.8},{"type":"web","url":"https://e.com","title":"블로그"}]'],
    ['done', '{"messageId":"31"}'],
  ];

  it('① 새 분석 — 토큰을 원문으로 누적 · analysisId · sources · 끝나면 streaming=false', async () => {
    useAuthStore.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: null });
    let body;
    server.use(http.post(`${API}/api/analyses/stream`, async ({ request }) => { body = await request.json(); return sseResponse(frames); }));
    const { result } = renderHook(() => useChatStream());
    await act(async () => { await result.current.start({ postingId: '12', resumeId: '15' }); });
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(body).toEqual({ postingId: '12', resumeId: '15' });
    expect(result.current.analysisId).toBe('7');
    const last = result.current.messages.at(-1);
    expect(last.role).toBe('ASSISTANT');
    expect(last.content).toBe('## 요구 기술\n| Kubernetes | 없음 |');
    expect(last.sources.map((s) => s.type)).toEqual(['doc', 'web']);
    expect(result.current.error).toBeNull();
  });

  it('② 후속 질문 — USER 메시지를 먼저 붙이고 analysisId·question을 보낸다', async () => {
    let body;
    server.use(http.post(`${API}/api/analyses/stream`, async ({ request }) => { body = await request.json(); return sseResponse(frames.slice(1)); }));
    const { result } = renderHook(() => useChatStream());
    await act(async () => { await result.current.start({ analysisId: '7', question: '뭐부터?' }); });
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(body).toEqual({ analysisId: '7', question: '뭐부터?' });
    expect(result.current.messages.map((m) => m.role)).toEqual(['USER', 'ASSISTANT']);
    expect(result.current.messages[0].content).toBe('뭐부터?');
  });

  it('③ error 이벤트 → error에 code가 담기고 streaming=false', async () => {
    server.use(http.post(`${API}/api/analyses/stream`, () => sseResponse([
      ['token', '"앞"'],
      ['error', '{"success":false,"statusCode":503,"code":"AI_UNAVAILABLE","message":"x","timestamp":"t"}'],
    ])));
    const { result } = renderHook(() => useChatStream());
    await act(async () => { await result.current.start({ postingId: '12', resumeId: '15' }); });
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(result.current.error?.code).toBe('AI_UNAVAILABLE');
  });

  it('④ 시작 전 검증 실패(403 봉투) → error.code FORBIDDEN · 스트림 없음', async () => {
    server.use(http.post(`${API}/api/analyses/stream`, () => new Response(
      JSON.stringify({ success: false, statusCode: 403, code: 'FORBIDDEN', message: 'x', timestamp: 't' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )));
    const { result } = renderHook(() => useChatStream());
    await act(async () => { await result.current.start({ postingId: '99', resumeId: '15' }); });
    expect(result.current.error?.code).toBe('FORBIDDEN');
    expect(result.current.streaming).toBe(false);
  });
});
