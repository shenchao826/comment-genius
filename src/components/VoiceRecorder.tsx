import { useState, useEffect, useCallback, useRef } from 'react';
import { memo } from 'react';
import { clsx } from 'clsx';
import { getSpeechToTextInstance, SpeechToTextManager } from '../utils/speechToText';

interface VoiceRecorderProps {
  onTranscriptUpdate: (text: string, isFinal: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function VoiceRecorder({
  onTranscriptUpdate,
  placeholder = '点击开始语音输入',
  disabled = false,
  className,
}: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const speechRef = useRef<SpeechToTextManager | null>(null);

  useEffect(() => {
    speechRef.current = getSpeechToTextInstance();
    setIsSupported(speechRef.current.isSupported());

    return () => {
      if (speechRef.current) {
        speechRef.current.stop();
      }
    };
  }, []);

  const toggleListening = useCallback(async () => {
    if (!speechRef.current || !speechRef.current.isSupported()) {
      setError('您的浏览器不支持语音识别');
      return;
    }

    if (isListening) {
      speechRef.current.stop();
      setIsListening(false);
      setInterimText('');
      return;
    }

    setError(null);
    setInterimText('');

    try {
      await speechRef.current.start({
        language: 'zh-CN',
        continuous: true,
        interimResults: true,
        onStart: () => {
          setIsListening(true);
          setInterimText('正在聆听...');
        },
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            setInterimText('');
            onTranscriptUpdate(transcript, true);
          } else {
            setInterimText(transcript);
            onTranscriptUpdate(transcript, false);
          }
        },
        onError: (errorMessage) => {
          setError(errorMessage);
          setIsListening(false);
          setInterimText('');
        },
        onEnd: () => {
          setIsListening(false);
          setInterimText('');
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '启动语音识别失败';
      setError(message);
      setIsListening(false);
    }
  }, [isListening, onTranscriptUpdate]);

  useEffect(() => {
    return () => {
      if (speechRef.current && isListening) {
        speechRef.current.stop();
      }
    };
  }, [isListening]);

  if (!isSupported) {
    return (
      <div className={clsx('rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700', className)}>
        ⚠️ 您的浏览器不支持语音识别，建议使用 Chrome 浏览器
      </div>
    );
  }

  return (
    <div className={clsx('space-y-2', className)}>
      {/* 控制按钮 */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600 animate-pulse'
            : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {isListening ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            停止录音
          </>
        ) : (
          <>🎤 {placeholder}</>
        )}
      </button>

      {/* 实时转写文本（临时结果） */}
      {interimText && interimText !== '正在聆听...' && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 italic">
          📝 {interimText}
          <span className="ml-1 text-xs text-blue-500">（正在识别...）</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ❌ {error}
        </div>
      )}

      {/* 使用提示 */}
      {!isListening && !error && (
        <p className="text-xs text-slate-400">💡 支持中文和英文语音输入，点击按钮后请对着麦克风说话</p>
      )}
    </div>
  );
}

export default memo(VoiceRecorder);
