import { describe, expect, it } from 'vitest';
import { createSseParser, decodeData } from './sse.js';

describe('[기술 리드 · 팀장 T-009] SSE 파서 — SPEC §4.3', () => {
  const collect = (chunks) => {
    const out = [];
    const p = createSseParser((e, d) => out.push([e, d]));
    chunks.forEach((c) => p.feed(c));
    return out;
  };

  it('프레임이 조각 중간에서 끊겨 와도 모은다', () => {
    expect(collect(['event: tok', 'en\ndata: "a"\n', '\nevent: done\ndata: {}\n\n'])).toEqual([['token', '"a"'], ['done', '{}']]);
  });

  it('data: 뒤 공백 0개도 허용한다 (Spring 재직렬화 — 첫 글자를 잃지 않는다)', () => {
    expect(collect(['event:token\ndata:"가"\n\n'])).toEqual([['token', '"가"']]);
  });

  it('CRLF 줄바꿈도 같은 결과', () => {
    expect(collect(['event: token\r\ndata: "x"\r\n\r\n'])).toEqual([['token', '"x"']]);
  });

  it('token data는 JSON 문자열 — 줄바꿈이 든 조각을 원문으로 복원한다', () => {
    expect(decodeData('"## 요구 기술\\n| a |"')).toBe('## 요구 기술\n| a |');
  });
});
