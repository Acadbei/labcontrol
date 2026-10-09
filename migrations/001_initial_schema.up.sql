CREATE TABLE import_batches (
  id uuid PRIMARY KEY,
  source_checksum char(64) NOT NULL UNIQUE,
  source_label text NOT NULL,
  status text NOT NULL CHECK (status IN ('committed', 'rolled_back')),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  operator text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  normalized_email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
  position text NOT NULL,
  avatar text,
  permissions text[] NOT NULL DEFAULT '{}',
  phone text,
  specialty text,
  source text,
  owner_id text,
  verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);

CREATE TABLE projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('Planning', 'Active', 'On Hold', 'Testing', 'Completed', 'Archived')),
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  start_date date,
  deadline date,
  manager_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  documents_count integer NOT NULL DEFAULT 0 CHECK (documents_count >= 0),
  tasks_count integer NOT NULL DEFAULT 0 CHECK (tasks_count >= 0),
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  technical_parameters jsonb NOT NULL DEFAULT '[]'::jsonb,
  overview text NOT NULL DEFAULT '',
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  source text,
  owner_id text,
  verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);
CREATE TABLE project_members (
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE documents (
  id text PRIMARY KEY,
  title text NOT NULL,
  original_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'docx', 'pptx', 'xlsx', 'txt', 'csv')),
  file_size bigint NOT NULL CHECK (file_size >= 0),
  storage_path text,
  project_id text REFERENCES projects(id) ON DELETE SET NULL,
  uploaded_by_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_by_name text NOT NULL,
  uploaded_at timestamptz NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  summary text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  technical_parameters jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_count integer CHECK (page_count IS NULL OR page_count >= 0),
  slide_count integer CHECK (slide_count IS NULL OR slide_count >= 0),
  word_count integer CHECK (word_count IS NULL OR word_count >= 0),
  is_indexed boolean NOT NULL DEFAULT false,
  chunks_count integer NOT NULL DEFAULT 0 CHECK (chunks_count >= 0),
  verified boolean NOT NULL DEFAULT false,
  provenance text,
  verified_by_id text REFERENCES users(id) ON DELETE SET NULL,
  verified_by_name text,
  verified_at timestamptz,
  source text,
  owner_id text,
  is_demo boolean NOT NULL DEFAULT false,
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);
CREATE INDEX documents_project_id_idx ON documents(project_id);
CREATE INDEX documents_verified_idx ON documents(verified) WHERE verified = true;
CREATE TABLE document_chunks (
  id text PRIMARY KEY,
  doc_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL,
  page_or_slide integer CHECK (page_or_slide IS NULL OR page_or_slide > 0),
  section_title text,
  embedding jsonb,
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  UNIQUE (doc_id, chunk_index)
);
CREATE INDEX document_chunks_doc_id_idx ON document_chunks(doc_id);

CREATE TABLE tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  project_id text NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  assignee_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  creator_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  deadline date NOT NULL,
  status text NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')),
  ai_summary text,
  comments jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  source text,
  owner_id text,
  verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);
CREATE INDEX tasks_project_status_idx ON tasks(project_id, status);
CREATE INDEX tasks_assignee_id_idx ON tasks(assignee_id);

CREATE TABLE knowledge_items (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Standard', 'Specification', 'Hardware', 'Software', 'CAD/3D', 'Research')),
  content text NOT NULL,
  project_id text REFERENCES projects(id) ON DELETE SET NULL,
  technical_parameters jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL,
  owner_id text REFERENCES users(id) ON DELETE SET NULL,
  source text,
  verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);
CREATE INDEX knowledge_items_project_id_idx ON knowledge_items(project_id);

CREATE TABLE audit_logs (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  source_actor_id text,
  user_name text NOT NULL,
  action text NOT NULL,
  object_name text NOT NULL,
  details text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('SUCCESS', 'WARNING', 'FAILED')),
  source text,
  is_demo boolean NOT NULL DEFAULT false,
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);
CREATE INDEX audit_logs_occurred_at_idx ON audit_logs(occurred_at DESC);

CREATE TABLE chat_messages (
  id text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_proposal jsonb,
  is_personal boolean NOT NULL DEFAULT true,
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);
CREATE INDEX chat_messages_owner_time_idx ON chat_messages(sender_id, occurred_at);
CREATE TABLE team_messages (
  id text PRIMARY KEY,
  sender_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sender_name text NOT NULL,
  sender_position text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
  content text NOT NULL,
  occurred_at timestamptz NOT NULL,
  category text CHECK (category IS NULL OR category IN ('general', 'urgent', 'test_report', 'task_update')),
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);

CREATE TABLE system_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  imported_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT
);
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_expiry_idx ON sessions(user_id, expires_at);
