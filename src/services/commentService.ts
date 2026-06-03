import apiClient from './api';

export interface Comment {
  id: string;
  student_name: string;
  content: string;
  content_edited?: string;
  traits: string[];
  comment_type: string;
  tone_style: string;
  comment_length: string;
  supplement?: string;
  model_used: string;
  is_favorited: boolean;
  feedback: number;
  word_count?: number;
  generation_time_ms?: number;
  tokens_used?: number;
  is_bulk: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenerateCommentParams {
  student_name?: string;
  trait_ids: string[];
  style: 'gentle' | 'formal' | 'humorous' | 'objective' | 'warm';
  length_type: 'concise' | 'standard' | 'detailed';
  comment_type?: 'summary' | 'encouragement' | 'improvement' | 'parent' | 'midterm' | 'single_subject' | 'growth_report';
  custom_prompt?: string;
}

const CommentService = {
  async generate(params: GenerateCommentParams): Promise<{ 
    id: string; 
    content: string; 
    word_count: number;
    remaining_quota: number;
    is_premium: boolean;
  }> {
    const result = await apiClient.generateComment(params);
    
    if (result.error === 'QUOTA_EXCEEDED') {
      throw new Error('今日免费额度已用完，请明天再试或升级到专业版');
    }
    
    if (result.error) {
      throw new Error(result.message || '生成失败');
    }

    return {
      id: result.id,
      content: result.content,
      word_count: result.word_count,
      remaining_quota: result.remaining_quota,
      is_premium: result.is_premium
    };
  },

  async getHistory(page = 1, limit = 20): Promise<Comment[]> {
    const result = await apiClient.getComments({ page, limit });
    return result.comments || [];
  },

  async getById(id: string): Promise<Comment> {
    return apiClient.getComment(id);
  },

  async updateContent(id: string, newContent: string): Promise<void> {
    await apiClient.updateComment(id, { content: newContent });
  },

  async delete(id: string): Promise<void> {
    await apiClient.deleteComment(id);
  },

  async regenerate(id: string): Promise<Comment> {
    const result = await apiClient.regenerateComment(id);
    return result.comment || result;
  },

  async toggleFavorite(id: string): Promise<boolean> {
    try {
      await apiClient.favoriteComment(id);
      return true;
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return false;
    }
  },

  async submitFeedback(id: string, feedback: -1 | 0 | 1): Promise<boolean> {
    try {
      await apiClient.submitFeedback(id, feedback);
      return true;
    } catch (error) {
      console.error('Submit feedback error:', error);
      return false;
    }
  },

  async bulkGenerate(params: {
    class_id: string;
    student_ids: string[];
    style: string;
    length_type: string;
    comment_type: string;
    custom_prompts?: Record<string, string>;
  }): Promise<{
    bulk_job_id: string;
    total: number;
    estimated_seconds: number;
  }> {
    const result = await apiClient.bulkGenerate(params);
    
    if (result.error) {
      throw new Error(result.message || '创建批量任务失败');
    }

    return {
      bulk_job_id: result.bulk_job_id,
      total: result.total,
      estimated_seconds: result.estimated_seconds
    };
  },

  async pollBulkJobStatus(jobId: string): Promise<{
    total: number;
    completed: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }> {
    return apiClient.getBulkJobStatus(jobId);
  },

  // Helper: Get display text for comment type
  getTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      summary: '期末总结',
      encouragement: '日常鼓励',
      improvement: '改进建议',
      parent: '家长沟通',
      midterm: '期中反馈',
      single_subject: '单科评语',
      growth_report: '成长简报'
    };
    return typeMap[type] || type;
  },

  // Helper: Get display text for style
  getStyleLabel(style: string): string {
    const styleMap: Record<string, string> = {
      gentle: '温和鼓励',
      formal: '正式严谨',
      humorous: '幽默亲切',
      objective: '客观中立',
      warm: '温暖亲切'
    };
    return styleMap[style] || style;
  },

  // Helper: Get display text for length
  getLengthLabel(length: string): string {
    const lengthMap: Record<string, string> = {
      concise: '精简版(80-120字)',
      standard: '标准版(200-300字)',
      detailed: '详细版(400-500字)'
    };
    return lengthMap[length] || length;
  }
};

export default CommentService;
