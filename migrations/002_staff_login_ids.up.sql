ALTER TABLE users ADD COLUMN IF NOT EXISTS login_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_roster_id text;

UPDATE users
SET login_id = COALESCE(NULLIF(login_id, ''), NULLIF(normalized_email, ''), id)
WHERE login_id IS NULL OR login_id = '';

ALTER TABLE users ALTER COLUMN login_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN normalized_email DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_login_id_unique ON users (login_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_staff_roster_id_unique ON users (staff_roster_id) WHERE staff_roster_id IS NOT NULL;
