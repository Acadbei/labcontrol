DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email IS NULL OR normalized_email IS NULL) THEN
    RAISE EXCEPTION 'Cannot roll back login ID migration while users have no email address';
  END IF;
END $$;

DROP INDEX IF EXISTS users_staff_roster_id_unique;
DROP INDEX IF EXISTS users_login_id_unique;
ALTER TABLE users ALTER COLUMN normalized_email SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP COLUMN IF EXISTS staff_roster_id;
ALTER TABLE users DROP COLUMN IF EXISTS login_id;
