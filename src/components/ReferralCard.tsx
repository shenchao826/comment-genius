import { useState, useEffect } from 'react';
import { getToken } from '../utils/auth';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_RAG_API_URL || '';

interface ReferralStats {
  code: string | null;
  total_invited: number;
  completed: number;
  pending: number;
  rewards: {
    threshold: number;
    reward_type: string;
    reward_value: number;
    description: string;
    achieved: boolean;
    claimed: boolean;
  }[];
}

export default function ReferralCard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        // 未登录时显示mock数据
        setStats({
          code: 'TEACH' + Math.random().toString(36).substr(2, 4).toUpperCase(),
          total_invited: 0,
          completed: 0,
          pending: 0,
          rewards: [
            {
              threshold: 1,
              reward_type: 'free_generations',
              reward_value: 3,
              description: '邀请1人：获赠3次免费生成',
              achieved: false,
              claimed: false,
            },
            {
              threshold: 3,
              reward_type: 'free_generations',
              reward_value: 10,
              description: '邀请3人：获赠10次免费生成',
              achieved: false,
              claimed: false,
            },
            {
              threshold: 5,
              reward_type: 'membership_days',
              reward_value: 7,
              description: '邀请5人：获得7天会员',
              achieved: false,
              claimed: false,
            },
          ],
        });
        return;
      }

      const res = await fetch(`${API_BASE}/api/referral/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCode() {
    if (!stats?.code) return;
    const shareText = `📝 来评语助手CommentGenius，输入我的邀请码 ${stats.code} 领取免费生成次数！✨

🔗 ${window.location.origin}?ref=${stats.code}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  if (loading) {
    return (
      <div className="bg-[rgba(30,41,59,0.8)] rounded-teacher-xl border border-[rgba(59,130,246,0.2)] p-5 shadow-teacher-card animate-pulse">
        <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
        <div className="h-10 bg-white/5 rounded mb-3" />
        <div className="h-4 bg-white/5 rounded w-2/3" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-[rgba(30,41,59,0.8)] rounded-teacher-xl border border-[rgba(59,130,246,0.2)] p-5 shadow-teacher-card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-full" />

      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg leading-none">🎁</span>
        <h3 className="text-base font-semibold text-white">
          {t('referral.title', { defaultValue: '邀请好友' })}
        </h3>
        {stats.total_invited > 0 && (
          <span className="ml-auto px-2 py-0.5 bg-yellow-500/15 rounded-full text-xs text-yellow-300 font-medium flex items-center gap-1">
            <span className="text-xs leading-none">👥</span>
            {stats.total_invited}人
          </span>
        )}
      </div>

      {stats.code && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">
            {t('referral.your_code', { defaultValue: '你的专属邀请码' })}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 py-2.5 px-4 bg-white/[0.04] rounded-lg shadow-teacher-subtle text-center">
              <span className="text-lg font-mono font-bold tracking-widest text-yellow-300">
                {stats.code}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors active:scale-95"
            >
              {copied ? (
                <span className="text-lg leading-none">✅</span>
              ) : (
                <span className="text-lg leading-none">📋</span>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 text-center">
            {t('referral.hint', { defaultValue: '好友注册后各得3次免费生成额度' })}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-slate-300 font-medium">
          {t('referral.rewards', { defaultValue: '邀请奖励' })}
        </p>
        {stats.rewards?.map((reward) => {
          const progress = Math.min(stats.total_invited / reward.threshold, 1);
          return (
            <div key={reward.threshold} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs ${reward.achieved ? 'text-yellow-300' : 'text-slate-400'}`}
                >
                  {reward.description}
                </span>
                {reward.claimed && <span className="text-xs text-green-400">✓</span>}
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    reward.achieved
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
