import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API } from '../test/handlers.js';
import { useChatStream } from './useChatStream.js';
import { useAuthStore } from '../stores/authStore.js';

// 회귀 테스트 — FE-분석 T-022-1 · PR #10 리뷰(팀장): reset()과 진행 중 요청의 경합
// 응답 스트림을 테스트가 직접 조종한다(이벤트를 원하는 순간에 보내고 닫는다).
// MSW+jsdom에서는 fetch를 abort해도 가짜 본문의 read()가 거절되지 않는다 — 브라우저처럼 AbortError로 끊는 것은 abort()가 흉내 낸다
function controlledSse() {
  const enc = new TextEncoder();
  let ctl;
  const stream = new ReadableStream({ start(c) { ctl = c; } });
  return {
    response: new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
    send: (event, data) => ctl.enqueue(enc.encode(`event:${event}\ndata:${data}\n\n`)),
    close: () => ctl.close(),
    abort: () => ctl.error(new DOMException('The operation was aborted.', 'AbortError')),
  };
}

describe('[FE-분석 T-022-1] useChatStream — reset()과 진행 중 요청의 경합', () => {
  let streams;
  beforeEach(() => {
    useAuthStore.getState().setSession({ accessToken: 'a', refreshToken: 'r', user: null });
    streams = [];
    server.use(http.post(`${API}/api/analyses/stream`, () => {
      const s = controlledSse();
      streams.push(s);
      return s.response;
    }));
  });

  it('스트리밍 중 reset() — messages가 비고 stopped 말풍선이 남지 않으며 streaming=false', async () => {
    const { result } = renderHook(() => useChatStream());
    let pending;
    act(() => { pending = result.current.start({ postingId: '12', resumeId: '15' }); });
    await waitFor(() => expect(streams).toHaveLength(1));
    act(() => streams[0].send('token', '"앞부분"'));
    await waitFor(() => expect(result.current.messages.at(-1)?.content).toBe('앞부분'));

    act(() => result.current.reset());
    act(() => streams[0].abort());               // 브라우저에서 abort가 read()를 거절하는 순간
    await act(async () => { await pending; });   // 버린 요청의 catch·finally가 끝까지 돈 뒤

    expect(result.current.messages).toEqual([]);
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.analysisId).toBeNull();
  });

  it('reset() 직후 새 분석 — 이전 요청의 finally가 새 요청의 streaming을 끄지 않고, 새 요청 결과만 남는다', async () => {
    const { result } = renderHook(() => useChatStream());
    let first;
    let second;
    act(() => { first = result.current.start({ postingId: '12', resumeId: '15' }); });
    await waitFor(() => expect(streams).toHaveLength(1));

    act(() => {   // 같은 틱에서 reset → 새 시작 (내비 "새 분석" 직후 바로 시작하는 경우)
      result.current.reset();
      second = result.current.start({ postingId: '12', resumeId: '15' });
    });
    await waitFor(() => expect(streams).toHaveLength(2));
    act(() => streams[0].send('token', '"옛 리포트"'));   // reset 뒤에 도착한 이전 요청의 이벤트는 버린다
    act(() => streams[0].abort());
    await act(async () => { await first; });     // 이전 요청의 catch·finally가 돌아도
    expect(result.current.streaming).toBe(true);  // 새 요청은 아직 스트리밍 중
    expect(result.current.messages).toEqual([{ role: 'ASSISTANT', content: '', sources: [] }]);

    act(() => {
      streams[1].send('analysis', '{"analysisId":"8"}');
      streams[1].send('token', '"새 리포트"');
      streams[1].close();
    });
    await act(async () => { await second; });

    expect(result.current.streaming).toBe(false);
    expect(result.current.analysisId).toBe('8');
    expect(result.current.messages).toEqual([{ role: 'ASSISTANT', content: '새 리포트', sources: [] }]);
    expect(result.current.error).toBeNull();
  });
});
