/**
 * SSE 프레임 파서 (오너: 팀장 · 소비: useChatStream) — SPEC §4.3.
 * - 프레임 경계 \n\n (조각이 프레임 중간에서 끊겨 와도 버퍼에 모은다)
 * - `event:`·`data:` 뒤 공백 0~1개 허용 (Spring이 다시 쓰면 공백이 없다 — 6글자를 자르면 첫 글자를 잃는다)
 * - data가 여러 줄이면 \n으로 잇는다 (SSE 규격)
 */
export function createSseParser(onEvent) {
  let buffer = '';
  return {
    feed(text) {
      buffer += text.replace(/\r\n/g, '\n');
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        let event = 'message';
        const data = [];
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).replace(/^ /, '');
          else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        }
        if (data.length) onEvent(event, data.join('\n'));
      }
    },
  };
}

/** token data는 JSON 문자열이다 ("\"안녕\\n\"") — 디코드해서 원문 조각을 돌려준다 */
export function decodeData(raw) {
  try { return JSON.parse(raw); } catch { return raw; }
}
