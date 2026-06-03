CREATE TABLE IF NOT EXISTS student_behaviors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  behavior_type TEXT NOT NULL,
  behavior_category TEXT NOT NULL,
  behavior_tag TEXT,
  description TEXT,
  points INTEGER DEFAULT 0,
  record_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_beh_user_student ON student_behaviors(user_id, student_id);
CREATE INDEX IF NOT EXISTS idx_beh_date ON student_behaviors(record_date);
CREATE INDEX IF NOT EXISTS idx_beh_type ON student_behaviors(behavior_type);
