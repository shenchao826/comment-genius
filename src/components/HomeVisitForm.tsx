import { useState, memo } from 'react';
import { clsx } from 'clsx';
import VoiceRecorder from './VoiceRecorder';
import { api } from '../utils/apiClient';

interface HomeVisitFormProps {
  studentId: string;
  studentName: string;
  onSaveComplete?: (record: any) => void;
}

export type VisitType = 'in_person' | 'phone' | 'video' | 'school_meeting';

interface HomeVisitRecord {
  visit_type: VisitType;
  visit_purpose: string;
  family_structure: string;
  key_topics: string;
  consensus: string;
  follow_plan: string;
  visit_date: string;
}

const VISIT_TYPES: { value: VisitType; label: string; icon: string; color: string; description: string }[] = [
  { value: 'in_person', label: '上门家访', icon: '🏠', color: 'indigo', description: '实地走访家庭，深入了解环境与氛围' },
  { value: 'phone', label: '电话家访', icon: '📞', color: 'green', description: '电话沟通，高效便捷的日常联络' },
  { value: 'video', label: '视频家访', icon: '📹', color: 'sky', description: '视频通话，远程面对面交流' },
  { value: 'school_meeting', label: '到校面谈', icon: '🏫', color: 'orange', description: '家长来校，正式面谈沟通' },
];

const VISIT_TEMPLATES: Record<VisitType, { purposePlaceholder: string; topicSuggestions: string[]; consensusHints: string[] }> = {
  in_person: {
    purposePlaceholder: '如：了解家庭环境、反馈在校表现、建立家校信任关系...',
    topicSuggestions: ['学习习惯', '作息规律', '亲子关系', '课外兴趣', '同伴交往', '家庭作业环境'],
    consensusHints: ['保持每日阅读30分钟', '周末限制屏幕时间', '家长每天检查作业签名', '参加学校开放日'],
  },
  phone: {
    purposePlaceholder: '如：反馈近期表现、通知重要事项、协调教育方式...',
    topicSuggestions: ['成绩波动', '作业态度', '考勤情况', '心理健康', '安全事项', '缴费通知'],
    consensusHints: ['关注孩子情绪变化', '配合完成实践作业', '按时接送上下学', '关注班级群消息'],
  },
  video: {
    purposePlaceholder: '如：展示学生作品、远程家长会、多方协同会议...',
    topicSuggestions: ['线上学习效果', '视力健康', '电子产品使用', '体育锻炼', '网课参与度'],
    consensusHints: ['控制每日用眼时间', '保证户外活动1小时', '规范电子设备使用时段', '定期进行视频家访'],
  },
  school_meeting: {
    purposePlaceholder: '如：家长到校面谈、班主任接待日、专题咨询...',
    topicSuggestions: ['升学规划', '选科指导', '特困帮扶', '投诉处理', '表彰颁奖', '志愿填报'],
    consensusHints: ['共同制定学习计划', '定期到校了解情况', '配合学校教育活动', '加入家长委员会'],
  },
};

export default memo(function HomeVisitForm({ studentId, studentName, onSaveComplete }: HomeVisitFormProps) {
  const [selectedType, setSelectedType] = useState<VisitType>('in_person');
  const [form, setForm] = useState<HomeVisitRecord>({
    visit_type: 'in_person',
    visit_purpose: '',
    family_structure: '',
    key_topics: '',
    consensus: '',
    follow_plan: '',
    visit_date: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const currentTemplate = VISIT_TEMPLATES[selectedType];

  const handleTypeChange = (type: VisitType) => {
    setSelectedType(type);
    setForm(prev => ({ ...prev, visit_type: type }));
  };

  const handleSave = async () => {
    if (!form.visit_purpose.trim()) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      const res = await api.post('/api/home-visits', {
        student_id: studentId,
        ...form,
      });

      if ((res.data as any).success) {
        setSaveMessage('✅ 家访记录保存成功');
        setForm(prev => ({
          ...prev,
          visit_purpose: '',
          family_structure: '',
          key_topics: '',
          consensus: '',
          follow_plan: '',
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

  const canSave = form.visit_purpose.trim().length > 0 && form.visit_date;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">家访方式 *</label>
        <div className="grid grid-cols-4 gap-2">
          {VISIT_TYPES_LIST.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTypeChange(type.value)}
              className={clsx(
                'flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-center transition-all',
                selectedType === type.value
                  ? `border-${type.color}-500 bg-${type.color}-50 shadow-sm`
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-xl">{type.icon}</span>
              <span className="text-xs font-medium">{type.label}</span>
            </button>
          ))}
        </div>
        {VISIT_TYPES_LIST.find(t => t.value === selectedType) && (
          <p className="mt-1.5 text-xs text-gray-500">
            {VISIT_TYPES_LIST.find(t => t.value === selectedType)?.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">家访目的 *</label>
          <textarea
            value={form.visit_purpose}
            onChange={(e) => setForm(prev => ({ ...prev, visit_purpose: e.target.value }))}
            placeholder={currentTemplate.purposePlaceholder}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
          {/* 语音输入 */}
          <div className="mt-2">
            <VoiceRecorder
              onTranscriptUpdate={(text, isFinal) => {
                if (isFinal) {
                  setForm(prev => ({
                    ...prev,
                    visit_purpose: prev.visit_purpose ? `${prev.visit_purpose}\n${text}` : text,
                  }));
                }
              }}
              placeholder="🎤 语音输入家访目的"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">家访日期 *</label>
          <input
            type="date"
            value={form.visit_date}
            onChange={(e) => setForm(prev => ({ ...prev, visit_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">家庭结构</label>
        <input
          type="text"
          value={form.family_structure}
          onChange={(e) => setForm(prev => ({ ...prev, family_structure: e.target.value }))}
          placeholder="如：与父母同住、单亲家庭、祖辈同住、寄宿等"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">主要议题</label>
        <input
          type="text"
          value={form.key_topics}
          onChange={(e) => setForm(prev => ({ ...prev, key_topics: e.target.value }))}
          placeholder="讨论的主要话题（多个话题用逗号分隔）"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <div className="flex flex-wrap gap-1 mt-1">
          {currentTemplate.topicSuggestions.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setForm(prev => ({
                ...prev,
                key_topics: prev.key_topics
                  ? `${prev.key_topics}、${topic}`
                  : topic,
              }))}
              className="px-2 py-0.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors"
            >
              +{topic}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">达成共识</label>
        <textarea
          value={form.consensus}
          onChange={(e) => setForm(prev => ({ ...prev, consensus: e.target.value }))}
          placeholder="与家长达成的共识或约定"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
        />
        {/* 语音输入 */}
        <div className="mt-2">
          <VoiceRecorder
            onTranscriptUpdate={(text, isFinal) => {
              if (isFinal) {
                setForm(prev => ({
                  ...prev,
                  consensus: prev.consensus ? `${prev.consensus}\n${text}` : text,
                }));
              }
            }}
            placeholder="🎤 语音输入达成共识"
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {currentTemplate.consensusHints.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => setForm(prev => ({
                ...prev,
                consensus: prev.consensus
                  ? `${prev.consensus}；${hint}`
                  : hint,
              }))}
              className="px-2 py-0.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-full transition-colors"
            >
              +{hint}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">跟进计划</label>
        <textarea
          value={form.follow_plan}
          onChange={(e) => setForm(prev => ({ ...prev, follow_plan: e.target.value }))}
          placeholder="后续跟进措施和时间安排"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
        />
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
            ...prev, visit_purpose: '', family_structure: '', key_topics: '', consensus: '', follow_plan: '',
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
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gray-400 cursor-not-allowed'
          )}
        >
          {isSaving ? '保存中...' : '💾 保存记录'}
        </button>
      </div>
    </div>
  );
});

const VISIT_TYPES_LIST = VISIT_TYPES;
