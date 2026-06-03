import { useState, type FC } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import { authService } from '../services/authService';

const Login: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请填写所有字段');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.login(email, password);
      if (result.success) {
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from, { replace: true });
      } else {
        setError(result.error || '登录失败');
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">🔐</span>
          <h1 className="text-3xl font-bold text-slate-900">登录</h1>
          <p className="text-slate-500 text-sm">欢迎回来，继续生成优质评语</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5 bg-white rounded-xl border border-slate-200 p-6 shadow-md"
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={isLoading}
            disabled={!email || !password}
            variant="primary"
            size="lg"
            className="w-full !py-3"
          >
            登录
          </Button>

          <div className="text-center text-sm text-slate-500">
            还没有账号？{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              立即注册
            </Link>
          </div>
        </form>

        <div className="text-center">
          <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
