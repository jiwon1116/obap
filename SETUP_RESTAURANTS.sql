-- ============================================
-- O!BAP Restaurant System Setup
-- ============================================
-- 이 SQL을 Supabase SQL Editor에서 실행하세요
-- https://supabase.com/dashboard/project/vqzixsmwhhxceiusoeeb/sql/new
-- ============================================

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT,
  address TEXT NOT NULL,
  road_address TEXT,

  -- Geospatial data (PostGIS)
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,

  -- Additional info
  place_url TEXT,
  price_tier TEXT CHECK (price_tier IN ('under_8000', 'around_10000', 'premium')),
  description TEXT,

  -- Ratings & Reviews
  avg_rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  review_count INTEGER DEFAULT 0,

  -- Opening info
  opening_date DATE,
  is_newly_opened BOOLEAN GENERATED ALWAYS AS (
    opening_date IS NOT NULL AND opening_date >= CURRENT_DATE - INTERVAL '90 days'
  ) STORED,

  -- External API reference
  naver_place_id TEXT UNIQUE,

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS restaurants_geom_idx ON restaurants USING GIST (geom);
CREATE INDEX IF NOT EXISTS restaurants_category_idx ON restaurants (category);
CREATE INDEX IF NOT EXISTS restaurants_avg_rating_idx ON restaurants (avg_rating DESC);
CREATE INDEX IF NOT EXISTS restaurants_review_count_idx ON restaurants (review_count DESC);
CREATE INDEX IF NOT EXISTS restaurants_newly_opened_idx ON restaurants (is_newly_opened) WHERE is_newly_opened = true;
CREATE INDEX IF NOT EXISTS restaurants_naver_place_id_idx ON restaurants (naver_place_id) WHERE naver_place_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Employees can create restaurants" ON restaurants;
DROP POLICY IF EXISTS "Creator or employees can update restaurants" ON restaurants;
DROP POLICY IF EXISTS "Creator can delete restaurants" ON restaurants;

-- Policy: Anyone can read restaurants
CREATE POLICY "Anyone can read restaurants"
  ON restaurants
  FOR SELECT
  USING (true);

-- Policy: Only authenticated employees can create restaurants
CREATE POLICY "Employees can create restaurants"
  ON restaurants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );

-- Policy: Only creator or employees can update restaurants
CREATE POLICY "Creator or employees can update restaurants"
  ON restaurants
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'employee'
      )
    )
  );

-- Policy: Only creator can delete restaurants
CREATE POLICY "Creator can delete restaurants"
  ON restaurants
  FOR DELETE
  USING (auth.uid() = created_by);

-- Function to calculate walking distance in minutes
-- Assumes walking speed of 1.2 m/s ≈ 72 m/min
CREATE OR REPLACE FUNCTION calculate_walking_distance_minutes(
  from_lat DOUBLE PRECISION,
  from_lng DOUBLE PRECISION,
  to_lat DOUBLE PRECISION,
  to_lng DOUBLE PRECISION
)
RETURNS INTEGER AS $$
BEGIN
  RETURN CEIL(
    ST_Distance(
      ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326)::geography
    ) / 72
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find restaurants within radius (in meters)
CREATE OR REPLACE FUNCTION find_restaurants_within_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  phone TEXT,
  address TEXT,
  road_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_url TEXT,
  price_tier TEXT,
  description TEXT,
  avg_rating DECIMAL,
  review_count INTEGER,
  opening_date DATE,
  is_newly_opened BOOLEAN,
  distance_meters DOUBLE PRECISION,
  walking_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.category,
    r.phone,
    r.address,
    r.road_address,
    r.latitude,
    r.longitude,
    r.place_url,
    r.price_tier,
    r.description,
    r.avg_rating,
    r.review_count,
    r.opening_date,
    r.is_newly_opened,
    ST_Distance(
      r.geom,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
    ) AS distance_meters,
    calculate_walking_distance_minutes(center_lat, center_lng, r.latitude, r.longitude) AS walking_minutes
  FROM restaurants r
  WHERE ST_DWithin(
    r.geom,
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurants_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Restaurant system setup complete!';
  RAISE NOTICE '📍 Table created: restaurants';
  RAISE NOTICE '🔧 Functions created: find_restaurants_within_radius, calculate_walking_distance_minutes';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now test the API at: http://localhost:3000/test-restaurants';
END $$;
