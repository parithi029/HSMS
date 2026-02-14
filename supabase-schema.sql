-- Indian Shelter Management System Database Schema (PostgreSQL)
-- Tailored for Indian Data Standards
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES TABLE (Role-Based Access Control)
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('volunteer', 'staff', 'admin')),
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core Data Elements
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  name_suffix TEXT,
  dob DATE,
  aadhaar_encrypted TEXT, -- Encrypted Aadhaar Number
  
  -- Demographics
  sex TEXT, -- Female, Male, Third Gender
  category TEXT, -- General, OBC, SC, ST
  ex_serviceman BOOLEAN, 
  
  -- Privacy & Consent
  privacy_flag BOOLEAN DEFAULT FALSE, -- Set TRUE for DV survivors, etc.
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_client_identifier UNIQUE (first_name, last_name, dob)
);

-- RLS Policies for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and Admin can view clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff and Admin can insert clients"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff and Admin can update clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- ============================================
-- HOUSEHOLDS TABLE
-- ============================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id TEXT UNIQUE NOT NULL, -- Custom household identifier
  head_of_household_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HOUSEHOLD MEMBERS TABLE
-- ============================================
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  relationship_to_hoh INTEGER NOT NULL, -- 1=Self, 2=Child, 3=Spouse/Partner, 4=Other relation, 5=Non-relation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (household_id, client_id)
);

-- ============================================
-- PROJECTS TABLE (Shelter Programs)
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name TEXT NOT NULL,
  project_type INTEGER NOT NULL, -- 1=Emergency Shelter, 2=Transitional Housing, etc.
  organization_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENROLLMENTS TABLE
-- ============================================
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Entry Information
  entry_date DATE NOT NULL,
  entry_assessment_date DATE,
  
  -- Prior Living Situation (HUD codes)
  living_situation_prior INTEGER, -- See hudConstants.js
  length_of_stay_prior INTEGER,
  
  -- Disabling Condition
  disabling_condition INTEGER, -- 0=No, 1=Yes, 8/9/99
  
  -- Exit Information
  exit_date DATE,
  exit_assessment_date DATE,
  destination INTEGER, -- See hudConstants.js
  exit_reason TEXT,
  housing_status_at_exit INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (exit_date IS NULL OR exit_date >= entry_date)
);

-- RLS for enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and Admin can manage enrollments"
  ON enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- ============================================
-- WARDS TABLE (Shelter Sections)
-- ============================================
CREATE TABLE wards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  ward_type TEXT DEFAULT 'general', -- general, medical, isolation, family
  gender_specific TEXT DEFAULT 'any', -- male, female, any
  capacity INTEGER, -- Optional: formal capacity
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for wards
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view wards"
  ON wards FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Staff and Admin can manage wards"
  ON wards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- ============================================
-- BEDS TABLE (Bed Inventory)
-- ============================================
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bed_number TEXT NOT NULL,
  unit_name TEXT, -- Legacy unit name (deprecated)
  ward_id UUID REFERENCES wards(id) ON DELETE CASCADE,
  bed_type TEXT DEFAULT 'emergency', -- emergency, overflow, transitional, permanent
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  gender_specific TEXT, -- Optional: 'male', 'female', 'any'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (ward_id, bed_number),
  UNIQUE (unit_name, bed_number) -- Legacy unique constraint
);

-- RLS for beds
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view beds"
  ON beds FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Staff and Admin can manage beds"
  ON beds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- ============================================
-- MIGRATION: Migrate unit_name to wards table
-- ============================================
-- Run this manually if you have existing data:
/*
INSERT INTO wards (name)
SELECT DISTINCT unit_name FROM beds
ON CONFLICT (name) DO NOTHING;

UPDATE beds
SET ward_id = wards.id
FROM wards
WHERE beds.unit_name = wards.name
AND beds.ward_id IS NULL;
*/


-- ============================================
-- BED ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE bed_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bed_id UUID REFERENCES beds(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- RLS for bed_assignments
ALTER TABLE bed_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view bed assignments"
  ON bed_assignments FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Staff and Admin can manage bed assignments"
  ON bed_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES enrollments(id),
  service_type INTEGER NOT NULL, -- See hudConstants.js
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  case_notes TEXT,
  
  provided_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONSENT & ROI TABLE
-- ============================================
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'ROI', 'Data Sharing', 'Photo Release', etc.
  consent_granted BOOLEAN NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  signature_data TEXT, -- Base64 encoded signature image
  
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG TABLE (FY 2026 Compliance)
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster audit queries
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beds_updated_at
  BEFORE UPDATE ON beds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-update bed status based on assignments
CREATE OR REPLACE FUNCTION update_bed_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new assignment is created without an end_date, mark bed as occupied
  IF (TG_OP = 'INSERT' AND NEW.end_date IS NULL) THEN
    UPDATE beds SET status = 'occupied' WHERE id = NEW.bed_id;
  END IF;
  
  -- When an assignment is ended, mark bed as available
  IF (TG_OP = 'UPDATE' AND NEW.end_date IS NOT NULL AND OLD.end_date IS NULL) THEN
    UPDATE beds SET status = 'available' WHERE id = NEW.bed_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bed_status
  AFTER INSERT OR UPDATE ON bed_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_bed_status();

-- ============================================
-- SEED DATA (Sample Project for Testing)
-- ============================================
INSERT INTO projects (project_name, project_type, organization_name)
VALUES ('Main Emergency Shelter', 1, 'Sample Shelter Organization');

-- Sample Beds (For Testing)
INSERT INTO beds (unit_name, bed_number, bed_type, status)
VALUES 
  ('Room A', '1', 'emergency', 'available'),
  ('Room A', '2', 'emergency', 'available'),
  ('Room A', '3', 'emergency', 'available'),
  ('Room B', '1', 'emergency', 'available'),
  ('Room B', '2', 'emergency', 'available'),
  ('Room C', '1', 'emergency', 'available'),
  ('Room C', '2', 'emergency', 'available'),
  ('Room C', '3', 'emergency', 'available');

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- Active Enrollments View
CREATE VIEW active_enrollments AS
SELECT 
  e.id,
  e.entry_date,
  c.first_name,
  c.last_name,
  c.dob,
  p.project_name,
  ba.bed_id,
  b.unit_name,
  b.bed_number
FROM enrollments e
JOIN clients c ON e.client_id = c.id
JOIN projects p ON e.project_id = p.id
LEFT JOIN bed_assignments ba ON e.id = ba.enrollment_id AND ba.end_date IS NULL
LEFT JOIN beds b ON ba.bed_id = b.id
WHERE e.is_active = TRUE AND e.exit_date IS NULL;

-- ============================================
-- IMPORTANT SETUP NOTES
-- ============================================
-- After running this script:
-- 1. Create your first user in Supabase Auth Dashboard
-- 2. Manually insert a record into user_profiles with role='admin'
-- 3. Update your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
-- 4. For SSN encryption, implement AES-256 encryption in your application layer
-- 5. Enable Realtime for the 'beds' and 'bed_assignments' tables in Supabase Dashboard

-- To enable Realtime (do this in Supabase Dashboard or via SQL):
-- ALTER PUBLICATION supabase_realtime ADD TABLE bed_assignments;

-- ============================================
-- MIGRATION: Allow 'client' role in user_profiles
-- ============================================
-- Run this in Supabase SQL Editor:
/*
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('client', 'volunteer', 'staff', 'admin'));
*/ 

-- ============================================
-- MIGRATION: Client Self-Service Features
-- ============================================
-- Run this in Supabase SQL Editor:
/*
-- 1. Add user_id to link clients to auth.users
ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_clients_user_id ON clients(user_id);

-- 2. Add approval status
ALTER TABLE clients ADD COLUMN approval_status TEXT DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 3. Update RLS Policies for Clients table
-- Allow users to create their own client record
CREATE POLICY "Users can create their own client profile"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view/edit their own client record
CREATE POLICY "Users can view own client profile"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own client profile"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);
*/
