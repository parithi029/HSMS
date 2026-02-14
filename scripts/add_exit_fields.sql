-- Add missing columns to enrollments table
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS exit_reason TEXT,
ADD COLUMN IF NOT EXISTS housing_status_at_exit INTEGER;

-- Update the schema cache (if running manually in Supabase SQL editor)
-- NOTIFY pgrst, 'reload schema';
