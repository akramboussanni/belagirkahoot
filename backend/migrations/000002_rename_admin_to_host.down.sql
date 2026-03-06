-- Rename hosts table back to admins
ALTER TABLE hosts RENAME TO admins;

-- Rename host_id back to admin_id in quizzes table
ALTER TABLE quizzes RENAME COLUMN host_id TO admin_id;

-- Rename constraint back
ALTER TABLE quizzes RENAME CONSTRAINT quizzes_host_id_fkey TO quizzes_admin_id_fkey;
