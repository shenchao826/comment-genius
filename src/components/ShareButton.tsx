import { useState, type FC } from 'react';
import { clipboardService } from '../services/clipboard';
import { trackEvent } from '../services/analytics';

interface ShareButtonProps {
  content: string;
  title?: string;
  studentName?: string;
  variant?: 'button' | 'icon';
  onShareComplete?: (channel: string) => void;
}

const ShareButton: FC<ShareButtonProps> = ({
  content,
  title = '学生评语',
  studentName,
  variant = 'button',
  onShareComplete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ visible: true, message, type });
    setTimeout(() => setFeedback((prev) => ({ ...prev, visible: false })), 2500);
  };

  const handleCopyToClipboard = async () => {
    const result = await clipboardService.copy(content, {
      formatAs: 'styled',
      studentName,
      title,
    });
    showFeedback(result.message, result.success ? 'success' : 'error');
    setShowMenu(false);
    if (result.success) onShareComplete?.('clipboard');
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${studentName || ''}的${title}`,
          text: content,
        });
        showFeedback('分享成功');
        trackEvent('COMMENT_SHARED', { channel: 'native', has_student_name: !!studentName });
        onShareComplete?.('native');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showFeedback('分享已取消', 'error');
        }
      }
    } else {
      showFeedback('当前浏览器不支持原生分享，已为您复制到剪贴板');
      await handleCopyToClipboard();
    }
    setShowMenu(false);
  };

  const generatePosterImage = async () => {
    setIsGeneratingPoster(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = 800;
      canvas.height = 1200;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, canvas.width, 200);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎓 评语助手', canvas.width / 2, 120);

      ctx.font = '32px sans-serif';
      ctx.fillText('AI赋能每一位教师', canvas.width / 2, 170);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(`${studentName || '学生'} 的${title}`, canvas.width / 2, 280);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 320);
      ctx.lineTo(canvas.width - 50, 320);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'left';

      const words = content.split('');
      let line = '';
      let y = 380;
      const maxWidth = canvas.width - 100;
      const lineHeight = 42;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, 50, y);
          line = words[i];
          y += lineHeight;

          if (y > canvas.height - 250) {
            ctx.fillText(line + '...', 50, y);
            break;
          }
        } else {
          line = testLine;
        }
      }

      if (y <= canvas.height - 250 && line) {
        ctx.fillText(line, 50, y);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`生成时间：${new Date().toLocaleDateString('zh-CN')}`, canvas.width / 2, canvas.height - 150);
      ctx.fillText('teachers.minicode.cloud', canvas.width / 2, canvas.height - 110);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width / 2 - 60, canvas.height - 90, 120, 80);
      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText('扫码体验', canvas.width / 2, canvas.height - 45);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${studentName || '评语'}_海报.png`;
          link.click();
          URL.revokeObjectURL(url);
          showFeedback('海报已保存');
          trackEvent('COMMENT_SHARED', { channel: 'poster', has_student_name: !!studentName });
          onShareComplete?.('poster');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Generate poster error:', error);
      showFeedback('海报生成失败，请重试', 'error');
    } finally {
      setIsGeneratingPoster(false);
      setShowMenu(false);
    }
  };

  const menuItems = [
    { key: 'copy', icon: '📋', label: '复制文本', action: handleCopyToClipboard },
    { key: 'poster', icon: '🖼️', label: isGeneratingPoster ? '生成中...' : '保存海报', action: generatePosterImage, disabled: isGeneratingPoster },
    { key: 'wechat', icon: '💬', label: '分享给好友', action: handleShareNative },
  ];

  if (variant === 'icon') {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="分享"
        >
          📤
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-xl p-2 min-w-[140px] z-50">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={item.action}
                  disabled={item.disabled}
                  className="w-full px-3 py-2 text-left hover:bg-slate-100 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            {feedback.visible && (
              <div className={`absolute bottom-full right-0 mb-20 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg z-50 ${
                feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {feedback.message}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      >
        📤 分享
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-lg shadow-xl p-2 min-w-[180px] z-50">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={item.action}
                disabled={item.disabled}
                className="w-full px-4 py-3 text-left hover:bg-slate-100 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          {feedback.visible && (
            <div className={`absolute top-full mt-16 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 whitespace-nowrap ${
              feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {feedback.message}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShareButton;
