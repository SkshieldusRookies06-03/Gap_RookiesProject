import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API, ok } from '../test/handlers.js';
import { useUpload } from './useUpload.js';

describe('[FE-화면 T-057] useUpload — 클라이언트 검증 및 업로드', () => {
  it('.exe 파일 업로드 시 UNSUPPORTED_FILE 에러 발생 및 네트워크 호출 0', async () => {
    let networkCalled = false;
    server.use(http.post(`${API}/api/documents`, () => {
      networkCalled = true;
      return HttpResponse.json(ok({ id: '99', title: 'test' }), { status: 201 });
    }));

    const { result } = renderHook(() => useUpload());
    const file = new File(['content'], 'malicious.exe', { type: 'application/x-msdownload' });

    await act(async () => {
      await expect(result.current.upload({ file, type: 'RESUME', title: '이력서' })).rejects.toMatchObject({
        code: 'UNSUPPORTED_FILE',
      });
    });

    expect(result.current.error?.code).toBe('UNSUPPORTED_FILE');
    expect(networkCalled).toBe(false);
  });

  it('200KB 초과 파일 업로드 시 FILE_TOO_LARGE 에러 발생', async () => {
    const { result } = renderHook(() => useUpload());
    const largeContent = new Uint8Array(200 * 1024 + 1);
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' });

    await act(async () => {
      await expect(result.current.upload({ file, type: 'JOB_POSTING', title: '대용량' })).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
      });
    });

    expect(result.current.error?.code).toBe('FILE_TOO_LARGE');
  });

  it('정상 파일 업로드 시 201 DocumentSummary 반환', async () => {
    const mockDoc = { id: '20', type: 'JOB_POSTING', title: '정상 공고', charCount: 100, createdAt: '2026-11-08T00:00:00+09:00' };
    server.use(http.post(`${API}/api/documents`, () => HttpResponse.json(ok(mockDoc), { status: 201 })));

    const { result } = renderHook(() => useUpload());
    const file = new File(['정상 내용'], 'job.md', { type: 'text/markdown' });

    let res;
    await act(async () => {
      res = await result.current.upload({ file, type: 'JOB_POSTING', title: '정상 공고' });
    });

    expect(res).toEqual(mockDoc);
    expect(result.current.error).toBeNull();
    expect(result.current.uploading).toBe(false);
  });
});
