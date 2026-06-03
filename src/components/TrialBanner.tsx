import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isLoggedIn } from '../utils/auth';
import Paywall from './Paywall';

interface TrialInfo {
  is_trial_active: boolean;
  trial_used: boolean;
  remaining_hours: number;
  trial_ends_at: string | null;
}

export default function TrialBanner() {
  const { t } = useTranslation();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;

    // 模拟获取试用状态（实际应调用API）
    const mockTrialInfo: TrialInfo = {
      is_trial_active: true,
      trial_used: true,
      remaining_hours: 48,
      trial_ends_at: new Date(Date.now() + 48 * 3600000).toISOString(),
    };
    setTrialInfo(mockTrialInfo);
  }, []);

  if (!trialInfo) return null;

  // 试用已过期
  if (!trialInfo.is_trial_active && trialInfo.trial_used) {
    return (
      <>
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 rounded-xl p-4 text-center">
          <p className="text-amber-300 text-sm font-medium">
            ⏰ {t('trial_expired', { defaultValue: '试用期已结束' })}
          </p>
          <button
            onClick={() => setShowPaywall(true)}
            className="mt-2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg text-white text-xs font-medium hover:from-blue-400 hover:to-cyan-400 transition-all"
          >
            {t('upgrade_prompt.cta', { defaultValue: '立即升级会员' })}
          </button>
        </div>
        {showPaywall && (
          <Paywall
            trigger="trial_expired"
            currentPlan="free"
            onClose={() => setShowPaywall(false)}
            onUpgrade={() => setShowPaywall(false)}
          />
        )}
      </>
    );
  }

  // 试用进行中
  if (trialInfo.is_trial_active) {
    const hours = trialInfo.remaining_hours;
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    const isUrgent = hours <= 24;

    return (
      <>
        <div
          className={`border rounded-xl p-4 text-center ${
            isUrgent
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400/30 animate-pulse-slow'
              : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-400/30'
          }`}
        >
          <p className={`text-sm font-medium ${isUrgent ? 'text-amber-300' : 'text-blue-300'}`}>
            {isUrgent ? '⏰' : '✨'}{' '}
            {t('trial_active', {
              days,
              hours: remainHours,
              defaultValue: `试用剩余 ${days}天${remainHours}小时`,
            })}
          </p>
          <p className="text-slate-400 text-xs mt-1">
            {t('trial_enjoy', { defaultValue: '享受全部高级功能' })}
          </p>
          {isUrgent && (
            <button
              onClick={() => setShowPaywall(true)}
              className="mt-2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg text-white text-xs font-medium hover:from-blue-400 hover:to-cyan-400 transition-all"
            >
              {t('upgrade_prompt.cta', { defaultValue: '立即升级会员' })}
            </button>
          )}
        </div>
        {showPaywall && (
          <Paywall
            trigger="trial_ending"
            currentPlan="trial"
            remainingFree={hours}
            onClose={() => setShowPaywall(false)}
            onUpgrade={() => setShowPaywall(false)}
          />
        )}
      </>
    );
  }

  return null;
}
