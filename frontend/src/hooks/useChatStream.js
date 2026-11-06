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
    // 요청마다 자기 컨트롤러 c — reset()이나 새 start()로 ctrl.current가 바뀌면 이 요청은 상태를 더 건드리지 않는다
    const c = new AbortController();
    ctrl.current = c;
    setStreaming(true);
    try {
      const res = await streamPost('/api/analyses/stream', req, c.signal);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      const parser = createSseParser((event, data) => {
        if (ctrl.current !== c) return;   // 이전 요청의 남은 이벤트는 버린다
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
      if (ctrl.current !== c) return;   // reset()으로 버린 요청 — 비운 messages에 stopped를 남기지 않는다
      if (isAbort(e)) patchLast((x) => ({ ...x, stopped: true }));   // 부분 답변은 화면에만 남는다(서버 저장 안 됨)
      else { setError(e); setMessages(dropEmpty); }
    } finally {
      if (ctrl.current === c) setStreaming(false);   // 이전 요청의 finally가 새 요청의 streaming을 끄지 않게
    }
  }, []);

  const stop = useCallback(() => ctrl.current?.abort(), []);
  const hydrate = useCallback((list, id) => {
    if (id) setAnalysisId(id);
    setMessages(list.map(({ role, content, sources }) => ({ role, content, sources: sources ?? [] })));
  }, []);
  const reset = useCallback(() => {
    ctrl.current?.abort();
    ctrl.current = null;   // 진행 중이던 요청을 "버린 요청"으로 만든다
    setStreaming(false);
    setMessages([]);
    setAnalysisId(null);
    setError(null);
  }, []);
  useEffect(() => () => ctrl.current?.abort(), []);   // 화면을 떠나면 스트림을 끊는다

  return { messages, streaming, error, analysisId, start, stop, hydrate, reset };
}
