-- Teachers App Database Schema
-- Complete DDL per TEACHERS_PRODUCT_SPEC.md §4.2
-- Using UUID primary keys + application-level RLS

-- Enable UUID generation (D1 compatible)
-- Note: D1 doesn't support native UUID, we use TEXT with generated UUIDs

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  plan_type TEXT DEFAULT 'free' CHECK(plan_type IN ('free', 'single', 'bulk', 'monthly', 'yearly', 'school')),
  trial_started_at TEXT,
  trial_ends_at TEXT,
  trial_used BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  -- RLS: Users can only access their own data (enforced at application level)
  CONSTRAINT valid_email CHECK(length(email) > 3 AND email LIKE '%@%')
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  grade TEXT,
  academic_year TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- RLS: Classes belong to specific user
  CONSTRAINT valid_class_name CHECK(length(name) > 0)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  class_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  student_number TEXT,
  gender TEXT CHECK(gender IN ('male', 'female', 'other', '')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- RLS: Students belong to user's classes
  CONSTRAINT valid_student_name CHECK(length(name) > 0)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  student_id TEXT,
  student_name TEXT NOT NULL,
  content TEXT NOT NULL,
  traits TEXT DEFAULT '[]' CHECK(json_valid(traits) OR traits = '[]'),
  comment_type TEXT DEFAULT 'summary' CHECK(comment_type IN ('summary', 'encouragement', 'improvement', 'parent')),
  tone_style TEXT DEFAULT 'formal' CHECK(tone_style IN ('gentle', 'strict', 'humorous', 'formal', 'warm', 'objective')),
  comment_length TEXT DEFAULT 'standard' CHECK(comment_length IN ('concise', 'standard', 'detailed')),
  supplement TEXT,
  model_used TEXT DEFAULT 'qwen-turbo',
  is_favorited BOOLEAN DEFAULT FALSE,
  feedback INTEGER DEFAULT 0 CHECK(feedback IN (-1, 0, 1)),
  quality_score REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  -- RLS: Comments belong to user
  CONSTRAINT valid_content CHECK(length(content) > 10),
  CONSTRAINT valid_student_name CHECK(length(student_name) > 0)
);

CREATE TABLE IF NOT EXISTS daily_quota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  used_count INTEGER DEFAULT 0 CHECK(used_count >= 0),
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  UNIQUE(user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom' CHECK(category IN ('built-in', 'custom', 'premium')),
  prompt_template TEXT NOT NULL,
  variables TEXT DEFAULT '[]' CHECK(json_valid(variables) OR variables = '[]'),
  is_premium BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  CONSTRAINT valid_template_name CHECK(length(name) > 0),
  CONSTRAINT valid_prompt CHECK(length(prompt_template) > 10)
);

-- Payment & Order System
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  order_id TEXT UNIQUE NOT NULL,  -- External order ID (TC-xxxxx)
  product_type TEXT NOT NULL CHECK(product_type IN ('single', 'bulk', 'monthly', 'yearly', 'school')),
  amount REAL NOT NULL CHECK(amount > 0),
  currency TEXT DEFAULT 'CNY',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded', 'expired')),
  payment_method TEXT DEFAULT 'wechat',
  payment_transaction_id TEXT,
  qrcode_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(order_id)
);

-- Referral System Tables (from SoulSpark pattern)
CREATE TABLE IF NOT EXISTS referral_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id TEXT NOT NULL,
  referee_id TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'rewarded')),
  invitee_ip TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  rewarded_at TEXT,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(referee_id)
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  threshold INTEGER NOT NULL CHECK(threshold > 0),
  reward_type TEXT NOT NULL CHECK(reward_type IN ('free_generations', 'membership_days', 'discount')),
  reward_value INTEGER NOT NULL CHECK(reward_value > 0),
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_claimed_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  reward_threshold INTEGER NOT NULL,
  reward_type TEXT,
  reward_value INTEGER,
  description TEXT,
  claimed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, reward_threshold)
);

-- ============================================
-- INDEXES for Performance Optimization
-- ============================================

-- Users indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan_type);
CREATE INDEX IF NOT EXISTS idx_users_premium ON users(is_premium);

-- Classes indexes
CREATE INDEX IF NOT EXISTS idx_classes_user ON classes(user_id);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

-- Comments indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_student ON comments(student_id);
CREATE INDEX IF NOT EXISTS idx_comments_favorited ON comments(user_id, is_favorited);
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_comments_tone ON comments(tone_style);

-- Quota indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_quota_user_date ON daily_quota(user_id, date);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_comment ON favorites(comment_id);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_premium ON templates(is_premium);

-- Orders indexes
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at DESC);

-- Referral indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_threshold ON referral_rewards(threshold);
CREATE INDEX IF NOT EXISTS idx_referral_claimed_user ON referral_claimed_rewards(user_id);

-- ============================================
-- Student Exam Records (Phase 4: Multi-source Data)
-- ============================================

CREATE TABLE IF NOT EXISTS student_exams (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  score REAL NOT NULL CHECK(score >= 0),
  full_score REAL DEFAULT 100 CHECK(full_score > 0),
  class_avg REAL,
  class_rank INTEGER,
  total_count INTEGER,
  exam_date TEXT,
  semester TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Exams indexes
CREATE INDEX IF NOT EXISTS idx_exams_user_student ON student_exams(user_id, student_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON student_exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON student_exams(subject);
CREATE INDEX IF NOT EXISTS idx_exams_exam_name ON student_exams(exam_name);

-- ============================================
-- SAMPLE DATA for Testing & Bootstrap
-- ============================================

-- Built-in Comment Templates (per spec §4.4)
INSERT OR IGNORE INTO templates (id, name, description, category, prompt_template, variables, is_premium) VALUES
  ('tpl_summary', '期末总结评语', '适用于学期末的综合评价', 'built-in',
   '请为{{student_name}}撰写一条期末总结风格的评语。学生特点：{{traits}}。语气要求：{{tone}}。字数：{{length}}。',
   '["student_name", "traits", "tone", "length"]', FALSE),

  ('tpl_encouragement', '日常鼓励评语', '用于激励学生的正向反馈', 'built-in',
   '请为{{student_name}}撰写一条鼓励性质的评语。重点突出优点和进步。语气要求：温暖鼓励。字数：{{length}}。',
   '["student_name", "length"]', FALSE),

  ('tpl_improvement', '改进建议评语', '指出问题并提供建设性意见', 'premium',
   '请为{{student_name}}撰写一条改进建议评语。需要改进的方面：{{traits}}。语气要求：客观中立但带有建设性。字数：{{length}}。',
   '["student_name", "traits", "length"]', TRUE),

  ('tpl_parent', '家长沟通评语', '适合向家长汇报的语言风格', 'premium',
   '请为{{student_name}}撰写一条适合向家长汇报的评语。语气要亲切专业，便于家长理解。字数：{{length}}。',
   '["student_name", "length"]', TRUE);

-- Sample referral rewards configuration (per spec §6.4)
INSERT OR IGNORE INTO referral_rewards (threshold, reward_type, reward_value, description, is_active) VALUES
  (1, 'free_generations', 3, '邀请1人：获赠3次免费生成额度', TRUE),
  (3, 'free_generations', 10, '邀请3人：获赠10次免费生成额度', TRUE),
  (5, 'membership_days', 7, '邀请5人：获得7天会员权益', TRUE),
  (10, 'membership_days', 30, '邀请10人：获得30天会员权益', TRUE),
  (20, 'discount', 20, '邀请20人：获得8折优惠券', TRUE);

-- ============================================
-- VIEWS for Common Queries
-- ============================================

-- User's favorited comments (optimized query)
CREATE VIEW IF NOT EXISTS v_user_favorites AS
SELECT
  c.*,
  f.created_at as favorited_at
FROM comments c
INNER JOIN favorites f ON c.id = f.comment_id
WHERE c.is_favorited = 1;

-- User's comment statistics
CREATE VIEW IF NOT EXISTS v_user_comment_stats AS
SELECT
  user_id,
  COUNT(*) as total_comments,
  SUM(CASE WHEN is_favorited = 1 THEN 1 ELSE 0 END) as favorite_count,
  SUM(CASE WHEN feedback = 1 THEN 1 ELSE 0 END) as positive_feedback,
  SUM(CASE WHEN feedback = -1 THEN 1 ELSE 0 END) as negative_feedback,
  MAX(created_at) as last_generated_at
FROM comments
GROUP BY user_id;
