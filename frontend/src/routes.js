// 경로 문자열은 여기 한 곳에서만 나온다 (오너: FE-화면) — <Route path>와 <Link to>에 같은 문자열을 두 번 쓰지 않는다
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DOCUMENTS: '/documents',
  ANALYSES: '/analyses',
  ANALYSIS_NEW: '/analyses/new',
  ANALYSIS: '/analyses/:id',
  analysis: (id) => `/analyses/${id}`,
};
