import { useState, memo } from 'react';
import { clsx } from 'clsx';
import VoiceRecorder from './VoiceRecorder';
import { api } from '../utils/apiClient';

interface ConversationFormProps {
  studentId: string;
  studentName: string;
  onSaveComplete?: (record: any) => void;
}

export type ConversationType = 'daily' | 'discipline' | 'praise' | 'psychological' | 'goal';

interface ConversationRecord {
  conversation_type: ConversationType;
  category: string;
  content: string;
  student_reaction: string;
  follow_up: string;
  conversation_date: string;
}

const CONVERSATION_TYPES: { value: ConversationType; label: string; icon: string; color: string; description: string }[] = [
  { value: 'daily', label: '日常沟通', icon: '💬', color: 'blue', description: '了解学习状态、关心生活琐事、日常交流' },
  { value: 'discipline', label: '纪律谈话', icon: '⚠️', color: 'amber', description: '课堂违纪、迟到早退、行为纠正' },
  { value: 'praise', label: '表扬鼓励', icon: '🌟', color: 'emerald', description: '进步表现、优秀事迹、竞赛获奖' },
  { value: 'psychological', label: '心理疏导', icon: '💚', color: 'teal', description: '情绪变化、压力来源、心理关怀' },
  { value: 'goal', label: '目标规划', icon: '🎯', color: 'purple', description: '学业目标、升学意向、能力提升' },
];

const TYPE_TEMPLATES: Record<ConversationType, { placeholder: string; reactionHints: string[]; followUpHints: string[] }> = {
  daily: {
    placeholder: '记录日常交流内容，如：了解最近学习状态、询问作业完成情况、关心生活琐事等...',
    reactionHints: ['积极回应', '略显疲惫', '情绪平稳', '主动分享', '沉默寡言'],
    followUpHints: ['持续关注', '定期检查作业', '与家长保持联系', '安排同伴互助'],
  },
  discipline: {
    placeholder: '记录纪律问题及谈话要点，如：课堂违纪具体情况、原因分析、学生认识、改进承诺等...',
    reactionHints: ['认识到错误', '态度抵触', '诚恳接受', '情绪激动', '沉默反思'],
    followUpHints: ['制定行为改进计划', '约定观察期', '联系家长配合', '安排班干部监督'],
  },
  praise: {
    placeholder: '记录表扬鼓励的内容，如：具体进步表现、优秀事迹细节、学生反应等...',
    reactionHints: ['信心倍增', '谦虚低调', '开心兴奋', '表示继续努力', '感谢老师'],
    followUpHints: ['班级公开表扬', '推荐参加活动', '树立为榜样', '赋予更多责任'],
  },
  psychological: {
    placeholder: '记录心理疏导内容，如：情绪变化原因、压力来源分析、疏导方向、学生反馈等...',
    reactionHints: ['逐渐敞开', '情绪释放', '仍显防备', '愿意尝试改变', '寻求帮助'],
    followUpHints: ['持续关注情绪状态', '定期谈心跟进', '必要时转介专业咨询', '家校协同支持'],
  },
  goal: {
    placeholder: '记录目标规划内容，如：学业目标设定、升学意向讨论、能力提升计划、阶段性里程碑等...',
    reactionHints: ['目标明确', '迷茫不确定', '热情高涨', '感到压力', '理性规划'],
    followUpHints: ['分解阶段性目标', '定期复盘进度', '提供资源支持', '联系学科老师协助'],
  },
};

export default memo(function ConversationForm({ studentId, studentName, onSaveComplete }: ConversationFormProps) {
  const [selectedType, setSelectedType] = useState<ConversationType>('daily');
  const [form, setForm] = useState<ConversationRecord>({
    conversation_type: 'daily',
    category: '',
    content: '',
    student_reaction: '',
    follow_up: '',
    conversation_date: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const currentTemplate = TYPE_TEMPLATES[selectedType];

  const handleTypeChange = (type: ConversationType) => {
    setSelectedType(type);
    setForm(prev => ({ ...prev, conversation_type: type }));
  };

  const handleSave = async () => {
    if (!form.content.trim()) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      const res = await api.post('/api/conversations', {
        student_id: studentId,
        ...form,
      });

      if ((res.data as any).success) {
        setSaveMessage('✅ 谈话记录保存成功');
        setForm(prev => ({
          ...prev,
          content: '',
          student_reaction: '',
          follow_up: '',
          category: '',
        }));
        onSaveComplete?.((res.data as any).data);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(`❌ ${(res.data as any).message || '保存失败'}`);
      }
    } catch (err: unknown) {
      setSaveMessage(`❌ ${err instanceof Error ? err.message : '网络错误，请重试'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = form.content.trim().length > 0 && form.conversation_date;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">谈话类型 *</label>
        <div className="grid grid-cols-5 gap-2">
          {CONV_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTypeChange(type.value)}
              className={clsx(
                'flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 text-center transition-all',
                selectedType === type.value
                  ? `border-${type.color}-500 bg-${type.color}-50 shadow-sm`
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-lg">{type.icon}</span>
              <span className="text-xs font-medium">{type.label}</span>
            </button>
          ))}
        </div>
        {CONV_TYPES.find(t => t.value === selectedType) && (
          <p className="mt-1.5 text-xs text-gray-500">
            {CONV_TYPES.find(t => t.value === selectedType)?.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">分类标签</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
            placeholder="如：学习态度、同学关系..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">谈话日期 *</label>
          <input
            type="date"
            value={form.conversation_date}
            onChange={(e) => setForm(prev => ({ ...prev, conversation_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">谈话内容 *</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
          placeholder={currentTemplate.placeholder}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <p className="mt-0.5 text-xs text-gray-400">{form.content.length} 字</p>

        {/* 语音输入 */}
        <div className="mt-2">
          <VoiceRecorder
            onTranscriptUpdate={(text, isFinal) => {
              if (isFinal) {
                setForm(prev => ({
                  ...prev,
                  content: prev.content ? `${prev.content}\n${text}` : text,
                }));
              }
            }}
            placeholder="🎤 语音输入谈话内容"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">学生反应</label>
          <input
            type="text"
            value={form.student_reaction}
            onChange={(e) => setForm(prev => ({ ...prev, student_reaction: e.target.value }))}
            placeholder="描述学生在谈话中的反应/态度"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {currentTemplate.reactionHints.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  student_reaction: prev.student_reaction
                    ? `${prev.student_reaction}、${hint}`
                    : hint,
                }))}
                className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
              >
                +{hint}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">后续措施</label>
          <input
            type="text"
            value={form.follow_up}
            onChange={(e) => setForm(prev => ({ ...prev, follow_up: e.target.value }))}
            placeholder="计划采取的后续行动"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            {currentTemplate.followUpHints.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  follow_up: prev.follow_up
                    ? `${prev.follow_up}、${hint}`
                    : hint,
                }))}
                className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
              >
                +{hint}
              </button>
            ))}
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={clsx(
          'text-sm text-center py-2 rounded-md',
          saveMessage.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {saveMessage}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setForm(prev => ({
            ...prev, content: '', student_reaction: '', follow_up: '', category: '',
          }))}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          清空
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className={clsx(
            'px-4 py-2 text-sm text-white rounded-md transition-colors',
            canSave && !isSaving
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          )}
        >
          {isSaving ? '保存中...' : '💾 保存记录'}
        </button>
      </div>
    </div>
  );
});

const CONV_TYPES = CONVERSATION_TYPES;
