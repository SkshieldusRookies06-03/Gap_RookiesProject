import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API, ok, page } from '../test/handlers.js';
import DocumentsPage from './DocumentsPage.jsx';

// FE-화면 · 업로드 폼 — 제목 자동 채움 · 브라우저 검사 문구 (11/11 TL 재현: 제목 없이 올리기 → 요청 0 · 원인 문구 없음)
const renderPage = () => {
  server.use(http.get(`${API}/api/documents`, () => HttpResponse.json(ok(page([])))));
  return render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
};
const pickFile = (name) => fireEvent.change(document.querySelector('input[type=file]'), {
  target: { files: [new File(['# 내용'], name, { type: 'text/markdown' })] },
});

describe('[FE-화면] 업로드 폼 제목 자동 채움 · 입력 오류 문구', () => {
  it('파일을 고르면 비어 있는 제목 칸이 파일 이름(확장자 제외)으로 채워진다', async () => {
    renderPage();
    pickFile('내 이력서.md');
    expect(await screen.findByDisplayValue('내 이력서')).toBeInTheDocument();
  });

  it('제목을 지우고 올리면 "제목은 1~100자" 문구가 보인다', async () => {
    renderPage();
    pickFile('내 이력서.md');
    fireEvent.change(await screen.findByPlaceholderText('문서 제목 (1~100자)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^(올리기|업로드)$/ }));
    expect(await screen.findByText(/제목은 1~100자/)).toBeInTheDocument();
  });
});