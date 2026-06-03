import { useState, memo } from 'react';
import { clsx } from 'clsx';
import { getErrorMessage } from '../utils/errorHandling';
import { api } from '../utils/apiClient';

interface BehaviorQuickLogProps {
  studentId: string;
  studentName: string;
  onSaveComplete?: (record: any) => void;
}

export type BehaviorType = 'praise' | 'warning' | 'punishment';
export type BehaviorCategory = 'classroom' | 'homework' | 'activity' | 'discipline' | 'other';

interface BehaviorRecord {
  behavior_type: BehaviorType;
  behavior_category: BehaviorCategory;
  behavior_tag: string;
  description: string;
  points?: number;
  record_date: string;
}

const BEHAVIOR_TYPES: { value: BehaviorType; label: string; icon: string; color: string }[] = [
  { value: 'praise', label: '表扬', icon: '🌟', color: 'emerald' },
  { value: 'warning', label: '提醒', icon: '⚡', color: 'amber' },
  { value: 'punishment', label: '惩罚', icon: '🔴', color: 'red' },
];

const CATEGORIES: { value: BehaviorCategory; label: string; icon: string }[] = [
  { value: 'classroom', label: '课堂表现', icon: '📖' },
  { value: 'homework', label: '作业情况', icon: '📝' },
  { value: 'activity', label: '活动参与', icon: '🏃' },
  { value: 'discipline', label: '纪律表现', icon: '⚖️' },
  { value: 'other', label: '其他', icon: '📌' },
];

const TAGS_BY_TYPE: Record<BehaviorType, string[]> = {
  praise: ['积极发言', '帮助同学', '认真听讲', '作业优秀', '主动提问', '乐于分享', '拾金不昧', '进步明显', '团结友爱', '有创意'],
  warning: ['上课走神', '作业迟交', '交头接耳', '迟到早退', '忘记带书', '字迹潦草', '不专心', '小动作多'],
  punishment: ['扰乱课堂', '欺凌同学', '考试作弊', '顶撞老师', '损坏公物', '逃课旷课'],
};

export default memo(function BehaviorQuickLog({ studentId, studentName, onSaveComplete }: BehaviorQuickLogProps) {
  const [selectedType, setSelectedType] = useState<BehaviorType>('praise');
  const [selectedCategory, setSelectedCategory] = useState<BehaviorCategory>('classroom');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [description, setDescription] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const currentTags = TAGS_BY_TYPE[selectedType] || [];

  const handleSave = async () => {
    if (!selectedTag.trim()) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      const res = await api.post('/api/behaviors', {
        student_id: studentId,
        behavior_type: selectedType,
        behavior_category: selectedCategory,
        behavior_tag: selectedTag,
        description: description || undefined,
        record_date: recordDate,
      });

      if ((res.data as any).success) {
        setSaveMessage(`✅ ${BEHAVIOR_TYPES.find(t => t.value === selectedType)?.label}记录保存成功`);
        setSelectedTag('');
        setDescription('');
        onSaveComplete?.((res.data as any).data);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(`❌ ${(res.data as any).message || '保存失败，请重试'}`);
      }
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, '网络连接失败，请检查网络后重试');
      // @ts-expect-error code may be added via Object.assign
      if (String((err as Error)?.code || '').includes('401') || String((err as Error)?.code || '').includes('AUTH')) {
        setSaveMessage('❌ 登录已过期，请重新登录');
      } else {
        setSaveMessage(`❌ ${errorMsg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = selectedTag.trim().length > 0 && recordDate;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">行为类型 *</label>
        <div className="flex gap-2">
          {BEHAVIOR_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => { setSelectedType(type.value); setSelectedTag(''); }}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all',
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">分类场景</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                selectedCategory === cat.value
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">快捷标签 *（点击选择）</label>
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                selectedTag === tag
                  ? selectedType === 'praise'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                    : selectedType === 'warning'
                      ? 'bg-amber-100 text-amber-700 border-amber-300 ring-2 ring-amber-200'
                      : 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">补充说明（可选）</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="补充具体细节..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">记录日期 *</label>
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          onClick={() => { setSelectedTag(''); setDescription(''); }}
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
              ? selectedType === 'praise' ? 'bg-emerald-600 hover:bg-emerald-700' :
                selectedType === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                  'bg-red-600 hover:bg-red-700'
              : 'bg-gray-400 cursor-not-allowed'
          )}
        >
          {isSaving ? '保存中...' : `💾 记录${BEHAVIOR_TYPES.find(t => t.value === selectedType)?.label}`}
        </button>
      </div>
    </div>
  );
});
