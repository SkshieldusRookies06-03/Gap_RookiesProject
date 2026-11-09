import { useState } from 'react';
import { api, ApiError } from '../api/client.js';

const MAX = 200 * 1024;
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  async function upload({ file, type, title }) {
    setError(null);
    const fail = (code, message) => { const e = new ApiError({ status: 0, code, message }); setError(e); throw e; };
    if (!file) return fail('VALIDATION_ERROR', '파일을 고르세요');
    if (!/\.(md|txt)$/i.test(file.name)) return fail('UNSUPPORTED_FILE', '.md 또는 .txt 파일만');
    if (file.size === 0) return fail('VALIDATION_ERROR', '빈 파일입니다');
    if (file.size > MAX) return fail('FILE_TOO_LARGE', '200KB 이하만');
    if (!title?.trim() || title.length > 100) return fail('VALIDATION_ERROR', '제목은 1~100자');
    const form = new FormData();
    form.append('file', file); form.append('type', type); form.append('title', title.trim());
    setUploading(true);
    try { return await api.upload('/api/documents', form); }
    catch (e) { setError(e); throw e; }
    finally { setUploading(false); }
  }
  return { upload, uploading, error };
}
