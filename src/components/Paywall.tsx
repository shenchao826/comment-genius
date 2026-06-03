import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PaywallProps {
  trigger: 'free_limit' | 'trial_ending' | 'trial_expired' | 'history_locked';
  currentPlan?: string;
  remainingFree?: number;
  onClose: () => void;
  onUpgrade: () => void;
}

const triggerConfig = {
  free_limit: {
    icon: '🔒',
    titleKey: 'paywall.freeLimit.title',
    descKey: 'paywall.freeLimit.desc',
    ctaKey: 'paywall.freeLimit.cta',
  },
  trial_ending: {
    icon: '⏰',
    titleKey: 'paywall.trialEnding.title',
    descKey: 'paywall.trialEnding.desc',
    ctaKey: 'paywall.trialEnding.cta',
  },
  trial_expired: {
    icon: '✨',
    titleKey: 'paywall.trialExpired.title',
    descKey: 'paywall.trialExpired.desc',
    ctaKey: 'paywall.trialExpired.cta',
  },
  history_locked: {
    icon: '📜',
    titleKey: 'paywall.historyLocked.title',
    descKey: 'paywall.historyLocked.desc',
    ctaKey: 'paywall.historyLocked.cta',
  },
};

const plans = [
  {
    id: 'monthly',
    priceKey: 'paywall.plan.monthly.price',
    periodKey: 'paywall.plan.monthly.period',
    badge: null,
    highlight: false,
  },
  {
    id: 'yearly',
    priceKey: 'paywall.plan.yearly.price',
    periodKey: 'paywall.plan.yearly.period',
    badge: 'paywall.plan.yearly.badge',
    highlight: true,
  },
];

export default function Paywall({ trigger, remainingFree, onClose, onUpgrade }: PaywallProps) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  const config = triggerConfig[trigger];

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await onUpgrade();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />

        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white z-10"
        >
          ✕
        </button>

        <div className="relative pt-8 pb-4 text-center">
          <div className="text-5xl mb-3">{config.icon}</div>
          <h2 className="text-xl font-bold text-white mb-2">{t(config.titleKey)}</h2>
          <p className="text-sm text-blue-200/70 px-6">
            {t(config.descKey, { count: remainingFree })}
          </p>
        </div>

        <div className="px-6 py-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '📝', label: t('paywall.feature.unlimited') },
              { icon: '💾', label: t('paywall.feature.history') },
              { icon: '⭐', label: t('paywall.feature.premium') },
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5">
                <span className="text-lg">{f.icon}</span>
                <span className="text-xs text-blue-200/80 text-center">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative w-full p-3 rounded-xl border transition-all text-left ${
                selectedPlan === plan.id
                  ? 'border-blue-400/50 bg-blue-500/20 shadow-lg shadow-blue-500/10'
                  : 'border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              {plan.highlight && plan.badge && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-full">
                  {t(plan.badge)}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'border-blue-400' : 'border-white/[0.15]'
                    }`}
                  >
                    {selectedPlan === plan.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    )}
                  </div>
                  <span className="text-white font-medium">{t(plan.priceKey)}</span>
                </div>
                <span className="text-xs text-blue-200/60">{t(plan.periodKey)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 pt-2 pb-2">
          <button
            onClick={handleUpgrade}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.98]"
          >
            {isProcessing ? t('paywall.processing') : t(config.ctaKey)}
          </button>
          <p className="text-center text-xs text-blue-200/40 mt-3">{t('paywall.cancelAnytime')}</p>
        </div>
      </div>
    </div>
  );
}
