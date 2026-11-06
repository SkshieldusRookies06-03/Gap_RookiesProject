import { useCallback, useEffect, useRef, useState } from 'react';
import { streamPost } from '../api/client.js';
import { createSseParser, decodeData } from '../api/sse.js';

// 오너: FE-분석 · T-022 · SPEC §4.3(이벤트) · §5(반환값) — 판정 테스트 src/hooks/useChatStream.test.jsx
// 반환: SPEC §5의 7개 + 확장 reset · hydrate(messages, id?)의 두 번째 인자는 확장
const isAbort = (e) => e?.name === 'AbortError' || e?.code === 'ABORTED';   // 중단은 에러가 아니다
const dropEmpty = (m) => (m.at(-1)?.role === 'ASSISTANT' && m.at(-1).content === '' ? m.slice(0, -1) : m);

export function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const ctrl = useRef(null);

  // req = {postingId, resumeId} | {analysisId, question} — 본문은 그대로 보낸다(키를 더하지 않는다)
  const start = useCallback(async (req) => {
    const patchLast = (fn) => setMessages((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);
    setError(null);
    setMessages((m) => [...m, ...(req.question ? [{ role: 'USER', content: req.question, sources: [] }] : []),
      { role: 'ASSISTANT', content: '', sources: [] }]);
    ctrl.current = new AbortController();
    setStreaming(true);
    try {
      const res = await streamPost('/api/analyses/stream', req, ctrl.current.signal);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      const parser = createSseParser((event, data) => {
        if (event === 'analysis') setAnalysisId(JSON.parse(data).analysisId);
        else if (event === 'token') patchLast((x) => ({ ...x, content: x.content + decodeData(data) }));
        else if (event === 'sources') patchLast((x) => ({ ...x, sources: JSON.parse(data) }));
        else if (event === 'error') { setError(JSON.parse(data)); setMessages(dropEmpty); }
      });
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if (isAbort(e)) patchLast((x) => ({ ...x, stopped: true }));   // 부분 답변은 화면에만 남는다(서버 저장 안 됨)
      else { setError(e); setMessages(dropEmpty); }
    } finally {
      setStreaming(false);
    }
  }, []);

  const stop = useCallback(() => ctrl.current?.abort(), []);
  const hydrate = useCallback((list, id) => {
    if (id) setAnalysisId(id);
    setMessages(list.map(({ role, content, sources }) => ({ role, content, sources: sources ?? [] })));
  }, []);
  const reset = useCallback(() => {
    ctrl.current?.abort();
    setMessages([]);
    setAnalysisId(null);
    setError(null);
  }, []);
  useEffect(() => () => ctrl.current?.abort(), []);   // 화면을 떠나면 스트림을 끊는다

  return { messages, streaming, error, analysisId, start, stop, hydrate, reset };
}
