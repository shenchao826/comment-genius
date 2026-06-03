import { useState, useCallback, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import PaymentQRModal from '../components/PaymentQRModal';
import { TEACHERS_PLANS, TeachersPlanId } from '../config/pricing';
import { paymentService, type OrderInfo } from '../services/paymentService';
import { authService } from '../services/authService';

const Membership: FC = () => {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<TeachersPlanId | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<OrderInfo | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const user = authService.getUser();
  const currentPlan = user?.plan_type || 'free';

  const handlePurchase = useCallback(async (planId: TeachersPlanId) => {
    if (planId === 'free') {
      navigate('/');
      return;
    }

    setLoadingPlanId(planId);
    setSelectedPlanId(planId);
    setPurchaseError(null);

    try {
      const result = await paymentService.createOrder(planId);
      if (result.success && result.order) {
        setPaymentOrder(result.order);
        setShowPaymentModal(true);
        if (result.mockMode) {
          console.info('Mock payment mode - using test QR code');
        }
      } else {
        setPurchaseError(result.error || '创建订单失败');
      }
    } catch (err: any) {
      setPurchaseError(err.message || '网络异常，请稍后重试');
    } finally {
      setLoadingPlanId(null);
    }
  }, [navigate]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentModal(false);
    setPaymentOrder(null);
    navigate('/profile', { state: { paymentSuccess: true } });
  }, [navigate]);

  const handlePaymentClose = useCallback(() => {
    setShowPaymentModal(false);
    if (paymentOrder) {
      paymentService.stopPolling(paymentOrder.orderId);
    }
  }, [paymentOrder]);

  const handleContactSales = () => {
    window.open('mailto:support@minicode.cloud?subject=学校版采购咨询 - 评语助手', '_blank');
  };

  const planEntries = Object.entries(TEACHERS_PLANS) as [TeachersPlanId, typeof TEACHERS_PLANS[TeachersPlanId]][];

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-12 pb-24">
      <div className="w-full max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-4">
          <span className="text-5xl">⭐</span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
            选择适合您的方案
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            解锁全部功能，让AI评语助手成为您的得力教学工具
            <br />
            <span className="text-sm text-slate-500">从 ¥1.9 开始 · 随时取消 · 7天无理由退款</span>
          </p>

          {user && (
            <p className="text-sm text-blue-600">
              当前账号：<strong>{user.name}</strong> · {user.is_premium ? '👑 会员用户' : '免费用户'}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {planEntries.map(([planId, plan]) => {
            const isCurrent = currentPlan === planId || (planId !== 'free' && user?.is_premium);
            return (
              <div
                key={planId}
                className={`relative bg-white rounded-xl p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  plan.popular
                    ? 'border-2 border-orange-500 ring-2 ring-orange-100'
                    : isCurrent
                      ? 'border-2 border-green-500 ring-2 ring-green-100'
                      : 'border border-slate-200'
                }`}
              >
                {(plan.badge || isCurrent) && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
                      isCurrent
                        ? 'bg-green-500 text-white'
                        : plan.popular
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'bg-amber-100 text-amber-700 border border-amber-300'
                    }`}
                  >
                    {isCurrent ? '✓ 当前使用' : plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-500">{plan.description.slice(0, 20)}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-blue-600">
                      {plan.price === 0 ? '免费' : `¥${plan.price}`}
                    </span>
                    {plan.durationDays > 0 && (
                      <span className="text-slate-500 text-sm">
                        /{plan.durationDays >= 365 ? '年' : plan.durationDays >= 30 ? '月' : `${plan.durationDays}天`}
                      </span>
                    )}
                    {plan.id === 'single_comment' && (
                      <span className="text-slate-500 text-sm">/条</span>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? 'primary' : isCurrent ? 'secondary' : 'secondary'}
                    onClick={() => !isCurrent && handlePurchase(planId)}
                    disabled={isCurrent || loadingPlanId === planId}
                    loading={loadingPlanId === planId}
                    size="sm"
                    className="w-full !py-2 !text-xs"
                  >
                    {loadingPlanId === planId
                      ? '处理中...'
                      : isCurrent
                        ? '当前方案'
                        : plan.cta}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">🏫 学校版</h3>
              <p className="text-slate-600">多教师协作 + 校长看板 + 私有部署</p>
              <ul className="flex flex-wrap gap-3 mt-3">
                {['多教师账号', '数据看板', '私有部署', '定制开发', '专属售后'].map((item) => (
                  <span key={item} className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs">
                    {item}
                  </span>
                ))}
              </ul>
            </div>
            <div className="text-right space-y-3">
              <div className="text-3xl font-bold text-slate-900">面议</div>
              <Button variant="secondary" onClick={handleContactSales}>
                📧 联系销售团队
              </Button>
            </div>
          </div>
        </div>

        {purchaseError && (
          <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{purchaseError}</p>
            <button
              onClick={() => setPurchaseError(null)}
              className="mt-2 w-full text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              关闭
            </button>
          </div>
        )}

        <PaymentQRModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          orderId={paymentOrder?.orderId || ''}
          qrcodeUrl={paymentOrder?.qrcodeUrl}
          amount={paymentOrder?.amount || 0}
          productName={paymentOrder?.productName || ''}
          onSuccess={handlePaymentSuccess}
        />

        <div className="text-center pt-8 space-y-4">
          <Button variant="ghost" onClick={() => navigate('/profile')}>
            ← 返回个人中心
          </Button>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500 pt-4 border-t border-slate-200">
            <div>✅ 7天无理由退款</div>
            <div>✅ 数据安全加密存储</div>
            <div>✅ 随时取消订阅</div>
            <div>✅ 优先客服支持</div>
          </div>

          <p className="text-xs text-slate-400">
            支付由虎皮椒提供安全保障 · 支持微信支付 · 如有问题请联系 support@minicode.cloud
          </p>
        </div>
      </div>
    </div>
  );
};

export default Membership;
