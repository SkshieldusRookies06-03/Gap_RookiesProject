import { Navigate, Route, Routes } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ROUTES } from './routes.js';
import { useAuthStore } from './stores/authStore.js';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import AnalysesPage from './pages/AnalysesPage.jsx';
import AnalysisPage from './pages/analysis/AnalysisPage.jsx';

// 보호 라우트 (점검서 F-3) — refresh 토큰이 없으면 로그인으로. access 만료는 api/client가 처리한다.
function Protected({ children }) {
  const loggedIn = useAuthStore((s) => Boolean(s.refreshToken));
  return loggedIn ? <Layout>{children}</Layout> : <Navigate to={ROUTES.LOGIN} replace />;
}
Protected.propTypes = { children: PropTypes.node.isRequired };

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.DOCUMENTS} element={<Protected><DocumentsPage /></Protected>} />
      <Route path={ROUTES.ANALYSES} element={<Protected><AnalysesPage /></Protected>} />
      <Route path={ROUTES.ANALYSIS_NEW} element={<Protected><AnalysisPage /></Protected>} />
      <Route path={ROUTES.ANALYSIS} element={<Protected><AnalysisPage /></Protected>} />
      <Route path="*" element={<Navigate to={ROUTES.DOCUMENTS} replace />} />
    </Routes>
  );
}
