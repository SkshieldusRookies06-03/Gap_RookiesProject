import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorMessage, { messageFor } from './ErrorMessage.jsx';

// 회귀 테스트 — 기술 리드 · SPEC §4.4 표시 문구 · 점검서 F-7(서버 message를 그대로 내지 않는다)

describe('[기술 리드 T-009] ErrorMessage — 코드별 문구 · 423 해제 시각 · F-7', () => {
  it('423 ACCOUNT_LOCKED — 서버 message에서 해제 시각만 뽑아 보여 준다 (SPEC §4.4 "해제 시각 표시")', () => {
    expect(messageFor({ code: 'ACCOUNT_LOCKED', message: '로그인 5회 실패로 잠겼습니다. 해제: 14:05:00' })).toContain('14:05:00');
    expect(messageFor({ code: 'ACCOUNT_LOCKED', message: '잠김 — 09:30에 해제' })).toContain('09:30');
  });

  it('423인데 시각이 없으면 기본 문구', () => {
    expect(messageFor({ code: 'ACCOUNT_LOCKED', message: '잠겼습니다' })).toBe('로그인 5회 실패로 잠겼습니다. 잠시 후 다시 시도해 주세요');
  });

  it('(지킴) 다른 코드는 서버 message를 쓰지 않는다 — 스택·HTML이 화면에 나오지 않는다 (F-7)', () => {
    expect(messageFor({ code: 'FORBIDDEN', message: '<img src=x onerror=alert(1)>' })).toBe('접근 권한이 없습니다');
    expect(messageFor({ code: 'INTERNAL_SERVER_ERROR', message: 'java.lang.NullPointerException at ...' })).toBe('잠시 후 다시 시도해 주세요');
    expect(messageFor({ code: 'ACCOUNT_LOCKED', message: '<script>12:00</script>' })).not.toContain('<script>');
  });

  it('ABORTED·NETWORK_ERROR·모르는 코드·null도 문구가 있다', () => {
    expect(messageFor({ code: 'ABORTED' })).toBe('요청을 취소했습니다');
    expect(messageFor({ code: 'NETWORK_ERROR' })).toBe('서버에 연결할 수 없습니다');
    expect(messageFor({ code: 'SOMETHING_NEW' })).toBe('잠시 후 다시 시도해 주세요');
    expect(messageFor(null)).toBe('잠시 후 다시 시도해 주세요');
  });

  it('role=alert로 렌더하고, onRetry가 있으면 "다시 시도" 버튼이 부른다', async () => {
    const onRetry = vi.fn();
    render(<ErrorMessage error={{ code: 'AI_UNAVAILABLE' }} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('분석 서버가 응답하지 않습니다');
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
