CREATE TABLE IF NOT EXISTS student_conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  conversation_type TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  student_reaction TEXT,
  follow_up TEXT,
  conversation_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conv_user_student ON student_conversations(user_id, student_id);
CREATE INDEX IF NOT EXISTS idx_conv_date ON student_conversations(conversation_date);
CREATE INDEX IF NOT EXISTS idx_conv_type ON student_conversations(conversation_type);

CREATE TABLE IF NOT EXISTS student_home_visits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  visit_type TEXT NOT NULL,
  visit_purpose TEXT,
  family_structure TEXT,
  key_topics TEXT,
  consensus TEXT,
  follow_plan TEXT,
  visit_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_visit_user_student ON student_home_visits(user_id, student_id);
CREATE INDEX IF NOT EXISTS idx_visit_date ON student_home_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visit_type ON student_home_visits(visit_type);
