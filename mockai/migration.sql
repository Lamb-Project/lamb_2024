-- apikey should be in presets and should be named as apiKey
ALTER TABLE presets ADD COLUMN apiKey TEXT;
ALTER TABLE users DROP COLUMN apikey;

-- remove any courses related table
DROP TABLE IF EXISTS course_presets;
DROP TABLE IF EXISTS user_courses;
DROP TABLE IF EXISTS courses;
