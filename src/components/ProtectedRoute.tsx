
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePremium?: boolean;
  fallback?: React.ReactNode;
}

const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
    <div className="flex flex-col items-center gap-4">
      <div className="text-4xl animate-bounce">🎓</div>
      <p className="text-sm text-slate-500 animate-pulse">正在验证身份...</p>
    </div>
  </div>
);

const PremiumRequiredScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
    <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center">
      <div className="text-5xl mb-4">💎</div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">需要高级版权限</h2>
      <p className="text-slate-600 mb-6">此功能仅对高级版会员开放，升级后即可使用</p>
      <a
        href="/membership"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        <span>💎</span>
        查看套餐方案
      </a>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requirePremium = false,
  fallback,
}) => {
  const location = useLocation();

  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getUser();

  if (!isAuthenticated) {
    const token = authService.getAccessToken();
    if (token && authService.isTokenExpired(token)) {
      return <AuthLoadingScreen />;
    }
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  if (requirePremium) {
    const isPremiumUser = user?.is_premium;
    if (!isPremiumUser) {
      return fallback || <PremiumRequiredScreen />;
    }
  }

  return <>{children}</>;
};

interface GuestRouteProps {
  children: React.ReactNode;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  if (isAuthenticated) {
    const from = (location.state as { from?: string })?.from || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
