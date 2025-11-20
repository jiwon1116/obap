-- ============================================
-- O!BAP Restaurant Table Setup (수정본)
-- ============================================

-- PostGIS 확장 활성화
CREATE EXTENSION IF NOT EXISTS postgis;

-- restaurants 테이블 생성
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT,
  address TEXT NOT NULL,
  road_address TEXT,

  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,

  place_url TEXT,
  price_tier TEXT CHECK (price_tier IN ('under_8000', 'around_10000', 'premium')),
  description TEXT,

  avg_rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  review_count INTEGER DEFAULT 0,

  opening_date DATE,
  -- is_newly_opened는 일반 컬럼으로 변경 (쿼리 시 계산)

  naver_place_id TEXT UNIQUE,

  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS restaurants_geom_idx ON restaurants USING GIST (geom);
CREATE INDEX IF NOT EXISTS restaurants_category_idx ON restaurants (category);
CREATE INDEX IF NOT EXISTS restaurants_avg_rating_idx ON restaurants (avg_rating DESC);
CREATE INDEX IF NOT EXISTS restaurants_review_count_idx ON restaurants (review_count DESC);
CREATE INDEX IF NOT EXISTS restaurants_opening_date_idx ON restaurants (opening_date) WHERE opening_date IS NOT NULL;

-- RLS 활성화
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Anyone can read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Employees can create restaurants" ON restaurants;
DROP POLICY IF EXISTS "Creator or employees can update restaurants" ON restaurants;
DROP POLICY IF EXISTS "Creator can delete restaurants" ON restaurants;
DROP POLICY IF EXISTS "Authenticated users can create restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can update own restaurants" ON restaurants;
DROP POLICY IF EXISTS "Users can delete own restaurants" ON restaurants;

-- 누구나 읽기 가능
CREATE POLICY "Anyone can read restaurants"
  ON restaurants FOR SELECT
  USING (true);

-- 인증된 사용자만 생성 가능
CREATE POLICY "Authenticated users can create restaurants"
  ON restaurants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 본인이 생성한 것만 수정 가능
CREATE POLICY "Users can update own restaurants"
  ON restaurants FOR UPDATE
  USING (auth.uid() = created_by);

-- 본인이 생성한 것만 삭제 가능
CREATE POLICY "Users can delete own restaurants"
  ON restaurants FOR DELETE
  USING (auth.uid() = created_by);

-- PostGIS 함수: 도보 시간 계산
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

-- 신규 오픈 여부 확인 함수
CREATE OR REPLACE FUNCTION is_newly_opened(opening_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN opening_date IS NOT NULL AND opening_date >= CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql STABLE;

-- PostGIS 함수: 반경 내 식당 검색
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
  walking_minutes INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
    (r.opening_date IS NOT NULL AND r.opening_date >= CURRENT_DATE - INTERVAL '90 days') AS is_newly_opened,
    ST_Distance(
      r.geom,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
    ) AS distance_meters,
    calculate_walking_distance_minutes(center_lat, center_lng, r.latitude, r.longitude) AS walking_minutes,
    r.created_by,
    r.created_at,
    r.updated_at
  FROM restaurants r
  WHERE ST_DWithin(
    r.geom,
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql STABLE;

-- updated_at 자동 업데이트 트리거
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
