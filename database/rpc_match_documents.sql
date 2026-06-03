-- Supabase RPC: match_documents
-- 用于 RAG 向量语义检索（需要 pgvector 扩展）
-- 部署步骤：
-- 1. 启用 pgvector 扩展: CREATE EXTENSION IF NOT EXISTS vector;
-- 2. 给 kb_documents 表添加 embedding 列:
--    ALTER TABLE kb_documents ADD COLUMN embedding vector(1536);
-- 3. 创建此 RPC 函数
-- 4. 在 ingest 流程中调用 embedding API 填充 embedding 列

CREATE OR REPLACE FUNCTION match_documents(
  query_text TEXT,
  match_count INT DEFAULT 5,
  filter_product TEXT DEFAULT NULL,
  filter_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  product_line TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- 生成查询文本的 embedding
  -- 注意：Supabase 内部无法直接调用 embedding API
  -- 此函数需要从应用层传入 query_embedding 参数
  -- 或者使用 Supabase Edge Function 生成 embedding

  -- 降级方案：使用全文搜索 + 关键词匹配
  RETURN QUERY
  SELECT
    kb.id::UUID,
    kb.title,
    kb.content,
    kb.content_type,
    kb.product_line,
    CASE 
      WHEN kb.title ILIKE '%' || query_text || '%' THEN 0.9
      WHEN kb.content ILIKE '%' || query_text || '%' THEN 0.7
      ELSE 0.3
    END as similarity
  FROM kb_documents kb
  WHERE kb.is_published = true
    AND (filter_product IS NULL OR kb.product_line = filter_product)
    AND (filter_content_type IS NULL OR kb.content_type = filter_content_type)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 完整向量检索版本（需要 pgvector + embedding 生成）
-- ============================================================
-- 当 kb_documents.embedding 列已填充后，使用以下版本替换：
--
-- CREATE OR REPLACE FUNCTION match_documents(
--   query_embedding vector(1536),
--   match_count INT DEFAULT 5,
--   filter_product TEXT DEFAULT NULL,
--   filter_content_type TEXT DEFAULT NULL
-- )
-- RETURNS TABLE (
--   id UUID,
--   title TEXT,
--   content TEXT,
--   content_type TEXT,
--   product_line TEXT,
--   similarity FLOAT
-- )
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     kb.id::UUID,
--     kb.title,
--     kb.content,
--     kb.content_type,
--     kb.product_line,
--     1 - (kb.embedding <=> query_embedding) as similarity
--   FROM kb_documents kb
--   WHERE kb.is_published = true
--     AND (filter_product IS NULL OR kb.product_line = filter_product)
--     AND (filter_content_type IS NULL OR kb.content_type = filter_content_type)
--   ORDER BY kb.embedding <=> query_embedding
--   LIMIT match_count;
-- END;
-- $$;
