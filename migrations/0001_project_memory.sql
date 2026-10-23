-- No company data or credentials are seeded into this public repository.
CREATE TABLE IF NOT EXISTS euro5_memories (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL,
 scope TEXT NOT NULL CHECK(scope IN ('company','user')), owner_id TEXT NOT NULL,
 record_key TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('profile','buyer_note','decision','preference')),
 buyer_code TEXT NOT NULL DEFAULT '', tender_id TEXT NOT NULL DEFAULT '', content TEXT NOT NULL,
 available_at TEXT NOT NULL, effective_at TEXT NOT NULL, recorded_at TEXT NOT NULL,
 actor_id TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS euro5_memory_context ON euro5_memories(company_id,available_at,effective_at);
CREATE INDEX IF NOT EXISTS euro5_memory_revision ON euro5_memories(company_id,scope,owner_id,kind,record_key,recorded_at);
