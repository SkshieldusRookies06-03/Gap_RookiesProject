// MSW 기본 응답 — SPEC §4 예시 그대로 (mock/server.mjs와 같은 모양). 테스트마다 server.use(...)로 덮는다.
import { http, HttpResponse } from 'msw';

export const API = 'http://localhost';
export const ts = '2026-11-06T10:00:00+09:00';
export const ok = (data, message = '요청이 완료되었습니다') => ({ success: true, data, message, timestamp: ts });
export const fail = (statusCode, code, message = '실패') => ({ success: false, statusCode, code, message, timestamp: ts });
export const page = (content) => ({
  content,
  page: { number: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true, numberOfElements: content.length },
});

export const sampleDocs = [
  { id: '12', type: 'JOB_POSTING', title: '카카오 백엔드 신입 공고', charCount: 2310, createdAt: ts },
  { id: '15', type: 'RESUME', title: '내 이력서 v2', charCount: 1820, createdAt: ts },
];

/** SSE 응답 — frames: [[event, dataString], ...] · 조각을 일부러 프레임 중간에서 자른다 */
export function sseResponse(frames, { splitAt = 7 } = {}) {
  const text = frames.map(([e, d]) => `event:${e}\ndata:${d}\n\n`).join('');
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < text.length; i += splitAt) c.enqueue(enc.encode(text.slice(i, i + splitAt)));
      c.close();
    },
  });
  return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}

export const handlers = [
  http.get(`${API}/api/documents`, () => HttpResponse.json(ok(page(sampleDocs)))),
];
