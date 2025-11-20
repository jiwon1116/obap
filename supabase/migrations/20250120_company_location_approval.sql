-- Add admin role to profiles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('employee', 'guest', 'admin'));

-- Create company_location_requests table for approval workflow
CREATE TABLE IF NOT EXISTS company_location_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User information
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Company location data
  company_name TEXT,
  company_address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,

  -- Geospatial data (PostGIS)
  geom GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_note TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS company_location_requests_user_id_idx ON company_location_requests (user_id);
CREATE INDEX IF NOT EXISTS company_location_requests_status_idx ON company_location_requests (status);
CREATE INDEX IF NOT EXISTS company_location_requests_geom_idx ON company_location_requests USING GIST (geom);

-- Enable Row Level Security
ALTER TABLE company_location_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own requests
CREATE POLICY "Users can read own location requests"
  ON company_location_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can read all requests
CREATE POLICY "Admins can read all location requests"
  ON company_location_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Authenticated users can create their own requests
CREATE POLICY "Users can create own location requests"
  ON company_location_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Only admins can update requests (for approval/rejection)
CREATE POLICY "Admins can update location requests"
  ON company_location_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_location_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_location_requests_updated_at
  BEFORE UPDATE ON company_location_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_location_requests_updated_at();

-- Add company_location fields to profiles table (for approved location)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS company_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS company_geom GEOGRAPHY(POINT, 4326);

-- Create index for company location
CREATE INDEX IF NOT EXISTS profiles_company_geom_idx ON profiles USING GIST (company_geom) WHERE company_geom IS NOT NULL;

-- Function to approve location request and update profile
CREATE OR REPLACE FUNCTION approve_company_location_request(
  request_id UUID,
  admin_id UUID,
  note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Check if admin exists and has admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve requests';
  END IF;

  -- Get the request
  SELECT * INTO request_record
  FROM company_location_requests
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update the request status
  UPDATE company_location_requests
  SET
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = admin_id,
    review_note = note
  WHERE id = request_id;

  -- Update the user's profile with approved location
  UPDATE profiles
  SET
    company_name = request_record.company_name,
    company_address = request_record.company_address,
    company_latitude = request_record.latitude,
    company_longitude = request_record.longitude,
    company_geom = ST_SetSRID(ST_MakePoint(request_record.longitude, request_record.latitude), 4326)::geography
  WHERE id = request_record.user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject location request
CREATE OR REPLACE FUNCTION reject_company_location_request(
  request_id UUID,
  admin_id UUID,
  note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if admin exists and has admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reject requests';
  END IF;

  -- Update the request status
  UPDATE company_location_requests
  SET
    status = 'rejected',
    reviewed_at = NOW(),
    reviewed_by = admin_id,
    review_note = note
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
