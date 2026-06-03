
interface WatermarkProps {
  text?: string;
  isPremium?: boolean;
  children: React.ReactNode;
}

const Watermark: React.FC<WatermarkProps> = ({ 
  text = '评语助手 AI生成', 
  isPremium = false,
  children 
}) => {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      
      {/* 水印层 */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4 opacity-30">
        <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
          📝 {text}
        </div>
      </div>

      {/* 背景水印 */}
      <div
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(200, 200, 200, 0.03) 10px,
            rgba(200, 200, 200, 0.03) 20px
          )`
        }}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-30deg] opacity-5 whitespace-nowrap">
          <span className="text-4xl font-bold text-slate-400">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Watermark;
