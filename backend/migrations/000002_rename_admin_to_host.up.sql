-- Rename admins table to hosts
ALTER TABLE admins RENAME TO hosts;

-- Rename admin_id to host_id in quizzes table
ALTER TABLE quizzes RENAME COLUMN admin_id TO host_id;

-- Update foreign key naming (optional but good practice)
-- Check the constraint name first, but usually it's public.quizzes_admin_id_fkey
-- Better to just rename the column and let PostgreSQL handle the existing constraint.
-- If we want to be explicit:
ALTER TABLE quizzes RENAME CONSTRAINT quizzes_admin_id_fkey TO quizzes_host_id_fkey;
