import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import { server } from '../test/server.js';
import { API, fail, ok } from '../test/handlers.js';
import { useAuthStore } from '../stores/authStore.js';

describe('LoginPage', () => {
  it('로그인 실패 시 실패 문구를 표시한다', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () =>
        HttpResponse.json(fail(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다'), { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('이메일'), 'wrong@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'wrongpass123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다');
  });

  it('로그인 성공 시 스토어에 refreshToken이 저장된다', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () =>
        HttpResponse.json(
          ok({
            accessToken: 'test-access',
            refreshToken: 'test-refresh',
            user: { uuid: '1', email: 'kim@example.com', name: '김루키' },
          }),
        ),
      ),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('이메일'), 'kim@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Passw0rd!');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await expect.poll(() => useAuthStore.getState().refreshToken).toBe('test-refresh');
  });
});

describe('RegisterPage', () => {
  it('초기 진입 시 잠시 후 다시 시도해 주세요 에러가 없고, 비밀번호·이름 안내 문구가 표시된다', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('잠시 후 다시 시도해 주세요')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호 8~64자')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이름 최대 20자')).toBeInTheDocument();
    expect(screen.getByText('비밀번호 8~64자')).toBeInTheDocument();
    expect(screen.getByText('이름 최대 20자')).toBeInTheDocument();
  });
});

