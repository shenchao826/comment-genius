import { create } from 'zustand';
import CommentService from '../services/commentService';

type StyleType = 'gentle' | 'formal' | 'humorous' | 'objective' | 'warm';
type LengthType = 'concise' | 'standard' | 'detailed';
type CommentType = 'summary' | 'encouragement' | 'improvement' | 'parent' | 'midterm' | 'single_subject' | 'growth_report';

interface CommentGenerationParams {
  student_name?: string;
  trait_ids: string[];
  style: StyleType;
  length_type: LengthType;
  comment_type?: CommentType;
  custom_prompt?: string;
}

interface CommentState {
  isGenerating: boolean;
  currentComment: any | null;
  generatedContent: string;
  error: string | null;
  remainingQuota: number;
  
  // Actions
  generate: (params: CommentGenerationParams) => Promise<void>;
  regenerate: (commentId: string) => Promise<void>;
  clearCurrentComment: () => void;
  setError: (error: string | null) => void;
  setRemainingQuota: (quota: number) => void;
}

export const useCommentStore = create<CommentState>((set) => ({
  isGenerating: false,
  currentComment: null,
  generatedContent: '',
  error: null,
  remainingQuota: 5,

  generate: async (params) => {
    set({ 
      isGenerating: true, 
      error: null, 
      generatedContent: '' 
    });

    try {
      const result = await CommentService.generate(params);
      
      set({
        isGenerating: false,
        currentComment: result,
        generatedContent: result.content,
        remainingQuota: result.remaining_quota
      });

      // Track analytics
      import('../services/analytics').then(({ default: analytics }) => {
        analytics.trackCommentGenerated({
          comment_id: result.id,
          comment_type: params.comment_type || 'summary',
          style: params.style,
          length_type: params.length_type,
          trait_count: params.trait_ids.length,
          word_count: result.word_count,
          generation_time_ms: 0, // Would need to measure actual time
          is_premium: result.is_premium
        });
      });

    } catch (error: any) {
      set({
        isGenerating: false,
        error: error.message || '生成失败，请重试'
      });
    }
  },

  regenerate: async (commentId) => {
    set({ isGenerating: true, error: null });

    try {
      const result = await CommentService.regenerate(commentId);
      
      set({
        isGenerating: false,
        currentComment: result,
        generatedContent: result.content
      });

    } catch (error: any) {
      set({
        isGenerating: false,
        error: error.message || '重新生成失败'
      });
    }
  },

  clearCurrentComment: () => {
    set({
      currentComment: null,
      generatedContent: '',
      error: null
    });
  },

  setError: (error) => set({ error }),
  setRemainingQuota: (quota) => set({ remainingQuota: quota })
}));
