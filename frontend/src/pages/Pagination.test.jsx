import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { api } from '../api/client.js';
import { server } from '../test/server.js';
import { API, ok, ts } from '../test/handlers.js';
import AnalysesPage from './AnalysesPage.jsx';
import DocumentsPage from './DocumentsPage.jsx';

afterEach(() => vi.restoreAllMocks());
const findCurrent = (number) => screen.findByRole('button', { name: `${number}페이지`, current: 'page' });

const cases = [
  { name: '내 문서', Component: DocumentsPage, endpoint: '/api/documents' },
  { name: '분석 기록', Component: AnalysesPage, endpoint: '/api/analyses' },
];

function response(number, { empty = false, totalElements = 21 } = {}) {
  const count = empty ? 0 : Math.max(0, Math.min(20, totalElements - number * 20));
  const totalPages = Math.max(1, Math.ceil(totalElements / 20));
  return {
    content: Array.from({ length: count }, (_, i) => ({
      id: String(number * 20 + i + 1), title: `페이지 ${number + 1} 항목${i ? ` ${i + 1}` : ''}`,
      type: 'JOB_POSTING', charCount: 100, createdAt: ts,
      postingTitle: '공고', resumeTitle: '이력서', messageCount: 2, lastStatus: 'DONE',
    })),
    page: {
      number, size: 20, totalElements, totalPages,
      first: number === 0, last: number >= totalPages - 1, numberOfElements: count,
    },
  };
}

describe.each(cases)('$name 페이지네이션', ({ Component, endpoint }) => {
  it('이전·다음이 첫 페이지와 마지막 페이지 사이를 순환하며 범위 안의 페이지만 요청한다', async () => {
    const requested = [];
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      requested.push(number);
      return HttpResponse.json(ok(response(number, { totalElements: 41 })));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    await findCurrent(1);
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await findCurrent(3);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await findCurrent(1);
    expect(requested).toEqual([0, 2, 0]);
  });

  it('한 페이지에서도 이전·다음이 활성화되고 현재 데이터를 다시 조회한다', async () => {
    const requested = [];
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      requested.push(number);
      return HttpResponse.json(ok(response(number, { totalElements: 1 })));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    await findCurrent(1);
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await findCurrent(1);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await findCurrent(1);
    expect(requested).toEqual([0, 0, 0]);
    expect(screen.getAllByRole('button', { name: /^\d+페이지$/ })).toHaveLength(1);
  });

  it('번호 버튼으로 페이지를 직접 선택하고 현재 번호를 활성 상태로 표시한다', async () => {
    const requested = [];
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      requested.push(number);
      return HttpResponse.json(ok(response(number, { totalElements: 41 })));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: '1페이지', current: 'page' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '3페이지' }));
    expect(await screen.findByRole('button', { name: '3페이지', current: 'page' })).toBeEnabled();
    expect(screen.getByText('페이지 3 항목')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '1페이지' }));
    await screen.findByRole('button', { name: '1페이지', current: 'page' });
    expect(requested).toEqual([0, 2, 0]);
  });

  it('잘못된 first·last 플래그가 유효한 페이지 번호의 이동을 막지 않는다', async () => {
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      const data = response(number, { totalElements: 41 });
      data.page.first = true;
      data.page.last = true;
      return HttpResponse.json(ok(data));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    await findCurrent(1);
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await findCurrent(2);
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  });

  it('페이지가 많아도 번호는 최대 5개씩 표시하고 마지막 페이지까지 이동한다', async () => {
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json(ok(response(number, { totalElements: 201 })));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    for (const target of [1, 5, 7, 9, 11]) {
      if (target > 1) fireEvent.click(screen.getByRole('button', { name: `${target}페이지` }));
      await screen.findByRole('button', { name: `${target}페이지`, current: 'page' });
      expect(screen.getAllByRole('button', { name: /^\d+페이지$/ })).toHaveLength(5);
    }
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  });

  it('빈 응답에 페이지 정보가 누락되어도 기존 빈 상태를 유지한다', async () => {
    server.use(http.get(`${API}${endpoint}`, () => HttpResponse.json(ok({ content: [] }))));
    render(<MemoryRouter><Component /></MemoryRouter>);
    expect(await screen.findByText(endpoint === '/api/documents' ? '공고나 이력서를 올려 보세요' : '아직 분석이 없습니다')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '페이지 이동' })).not.toBeInTheDocument();
  });

  it.each([0, 1, 20, 21, 40, 41])('%i개 데이터의 페이지 경계와 중간 페이지 버튼이 올바르다', async (totalElements) => {
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json(ok(response(number, { totalElements })));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    if (totalElements === 0) {
      expect(await screen.findByText(endpoint === '/api/documents' ? '공고나 이력서를 올려 보세요' : '아직 분석이 없습니다')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: '페이지 이동' })).not.toBeInTheDocument();
      return;
    }
    const totalPages = Math.ceil(totalElements / 20);
    for (let number = 0; number < totalPages; number += 1) {
      await findCurrent(number + 1);
      const prev = screen.getByRole('button', { name: '이전' });
      const next = screen.getByRole('button', { name: '다음' });
      expect(prev).toBeEnabled();
      expect(next).toBeEnabled();
      if (number < totalPages - 1) fireEvent.click(next);
    }
  });

  it('first·last가 누락되어도 유효한 number·totalPages로 버튼 경계를 판단한다', async () => {
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      const data = response(number, { totalElements: 41 });
      delete data.page.first;
      delete data.page.last;
      return HttpResponse.json(ok(data));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    await findCurrent(1);
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await findCurrent(2);
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await findCurrent(3);
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(await findCurrent(2)).toBeInTheDocument();
  });

  it('페이지 메타데이터가 없으면 버튼을 강제로 활성화하지 않는다', async () => {
    const data = response(0);
    delete data.page;
    server.use(http.get(`${API}${endpoint}`, () => HttpResponse.json(ok(data))));
    render(<MemoryRouter><Component /></MemoryRouter>);
    await screen.findByText('페이지 1 항목');
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it('0부터 시작하는 API 페이지로 왕복하고 이전·다음 버튼을 활성화한다', async () => {
    const queries = [];
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      queries.push(Object.fromEntries(q));
      return HttpResponse.json(ok(response(Number(q.get('page')))));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);

    expect(await findCurrent(1)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await findCurrent(2)).toBeInTheDocument();
    expect(screen.getByText('페이지 2 항목')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(await findCurrent(1)).toBeInTheDocument();
    expect(queries.map((q) => q.page)).toEqual(['0', '1', '0']);
    expect(queries.every((q) => q.size === '20')).toBe(true);
    if (endpoint === '/api/documents') {
      expect(queries.every((q) => q.sort === 'createdAt,desc')).toBe(true);
    }
  });

  it('이동한 페이지가 비어 있어도 이전 페이지로 돌아갈 수 있다', async () => {
    server.use(http.get(`${API}${endpoint}`, ({ request }) => {
      const number = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json(ok(response(number, { empty: number === 1 })));
    }));
    render(<MemoryRouter><Component /></MemoryRouter>);
    await findCurrent(1);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    const prev = await screen.findByRole('button', { name: '이전' });
    expect(prev).toBeEnabled();
    fireEvent.click(prev);
    expect(await screen.findByText('페이지 1 항목')).toBeInTheDocument();
  });

  it.each(['success', 'error'])('늦게 도착한 이전 요청의 %s가 현재 페이지를 덮어쓰지 않는다', async (outcome) => {
    let resolveOld;
    let rejectOld;
    const old = new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; });
    vi.spyOn(api, 'get')
      .mockImplementationOnce(() => old)
      .mockImplementation((path) => Promise.resolve(response(Number(new URL(path, API).searchParams.get('page')))));
    // 실제 main.jsx와 같은 StrictMode: 먼저 보낸 요청이 페이지 이동 뒤에 끝나는 상황.
    render(<StrictMode><MemoryRouter><Component /></MemoryRouter></StrictMode>);
    await findCurrent(1);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await findCurrent(2);

    await act(async () => {
      if (outcome === 'success') resolveOld(response(0));
      else rejectOld(new Error('이전 요청 실패'));
      await old.catch(() => {});
    });
    expect(screen.getByRole('button', { name: '2페이지', current: 'page' })).toBeInTheDocument();
    expect(screen.getByText('페이지 2 항목')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('내 문서 조회 조건 변경', () => {
  it.each(['type', 'sort'])('%s 변경 시 첫 페이지로 초기화하고 요청 파라미터를 유지한다', async (change) => {
    const queries = [];
    server.use(http.get(`${API}/api/documents`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      queries.push(Object.fromEntries(q));
      const data = response(Number(q.get('page')), { totalElements: 41 });
      if (q.get('type')) data.content.forEach((d) => { d.type = q.get('type'); });
      return HttpResponse.json(ok(data));
    }));
    render(<MemoryRouter><DocumentsPage /></MemoryRouter>);
    await findCurrent(1);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await findCurrent(2);
    if (change === 'type') fireEvent.click(screen.getByRole('button', { name: '이력서', exact: true }));
    else fireEvent.change(screen.getByRole('combobox', { name: '문서 정렬' }), { target: { value: 'title,asc' } });
    await findCurrent(1);
    expect(queries.at(-1)).toEqual({
      page: '0', size: '20', sort: change === 'sort' ? 'title,asc' : 'createdAt,desc',
      ...(change === 'type' ? { type: 'RESUME' } : {}),
    });
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
  });
});
