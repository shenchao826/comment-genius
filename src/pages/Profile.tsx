import { useState, useEffect, type FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import TrialBanner from '../components/TrialBanner';
import ReferralCard from '../components/ReferralCard';
import { authService } from '../services/authService';

const API_BASE = import.meta.env.VITE_RAG_API_URL || '';

const Profile: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<ReturnType<typeof authService.getUser>>(null);
  const [quota, setQuota] = useState({ remaining: 3, limit: 3, used: 0 });
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    if ((location.state as { paymentSuccess?: boolean })?.paymentSuccess) {
      setShowPaymentSuccess(true);
      window.history.replaceState({}, '', '/profile');
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }
  }, [location.state]);

  useEffect(() => {
    const userInfo = authService.getUser();
    if (userInfo) {
      setUser(userInfo);
    }

    const fetchQuota = async () => {
      try {
        const token = authService.getAccessToken();
        if (!token) return;
        const response = await fetch(`${API_BASE}/api/quota?user_id=${userInfo?.id || 'anonymous'}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setQuota(data);
        }
      } catch (error) {
        console.error('Failed to fetch quota:', error);
      }
    };

    fetchQuota();
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 pb-20">
        <div className="text-center space-y-4">
          <p className="text-slate-500">请先登录</p>
          <Button onClick={() => navigate('/login')}>去登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 pb-24">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">👤</span>
          <h1 className="text-3xl font-bold text-slate-900">个人中心</h1>
        </div>

        <TrialBanner />

        {showPaymentSuccess && (
          <div className="animate-fade-in-up bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-semibold text-green-800">支付成功！</p>
              <p className="text-sm text-green-600">您的会员权益已开通，感谢支持</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl text-white font-bold">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900">{user.name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.is_premium ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {user.is_premium ? '⭐ 会员用户' : '免费用户'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-2xl font-bold text-green-600">{quota.remaining}</div>
              <div className="text-xs text-slate-500 mt-1">剩余次数</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-2xl font-bold text-blue-600">{quota.used}</div>
              <div className="text-xs text-slate-500 mt-1">已使用</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-2xl font-bold text-purple-600">{quota.limit}</div>
              <div className="text-xs text-slate-500 mt-1">每日限额</div>
            </div>
          </div>

          {!user.is_premium && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">升级到会员</h3>
                  <p className="text-sm text-slate-600 mt-1">每日50次生成 · 无限收藏 · 高级模板</p>
                </div>
                <Button onClick={() => navigate('/membership')} variant="primary" size="sm">
                  立即升级
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => navigate('/history')} className="w-full">
              📜 查看历史记录
            </Button>
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              🚪 退出登录
            </Button>
          </div>
        </div>

        <ReferralCard />
      </div>
    </div>
  );
};

export default Profile;
