-- Make idf_number optional (no longer required at registration)
ALTER TABLE profiles ALTER COLUMN idf_number DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN idf_number SET DEFAULT '';
