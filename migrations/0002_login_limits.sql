CREATE TABLE IF NOT EXISTS euro5_login_limits (
  bucket TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
