import { useCallback } from 'react';
import { useCommentStore } from '../store/commentStore';

export function useCommentGeneration() {
  const { 
    generate, 
    regenerate, 
    isGenerating, 
    currentComment, 
    generatedContent, 
    error,
    clearCurrentComment,
    remainingQuota 
  } = useCommentStore();

  const handleGenerate = useCallback(async (params: {
    student_name?: string;
    trait_ids: string[];
    style: string;
    length_type: string;
    comment_type?: string;
    custom_prompt?: string;
  }) => {
    try {
      await generate(params as any);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [generate]);

  const handleRegenerate = useCallback(async (commentId: string) => {
    try {
      await regenerate(commentId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [regenerate]);

  const clear = useCallback(() => {
    clearCurrentComment();
  }, [clearCurrentComment]);

  return {
    generate: handleGenerate,
    regenerate: handleRegenerate,
    clear,
    
    // State
    isGenerating,
    currentComment,
    generatedContent,
    error,
    remainingQuota,
    
    // Computed
    hasGeneratedContent: !!generatedContent,
    canGenerate: !isGenerating && remainingQuota > 0
  };
}
