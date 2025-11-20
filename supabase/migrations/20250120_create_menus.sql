-- Create menus table for restaurant menu items
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  image_url TEXT,
  is_signature BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS menus_restaurant_id_idx ON menus (restaurant_id);
CREATE INDEX IF NOT EXISTS menus_is_signature_idx ON menus (is_signature) WHERE is_signature = true;
CREATE INDEX IF NOT EXISTS menus_is_available_idx ON menus (is_available) WHERE is_available = true;

-- Enable Row Level Security
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read available menus
CREATE POLICY "Anyone can read available menus"
  ON menus
  FOR SELECT
  USING (is_available = true OR auth.uid() IS NOT NULL);

-- Policy: Only admins can insert menus
CREATE POLICY "Only admins can insert menus"
  ON menus
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update menus
CREATE POLICY "Only admins can update menus"
  ON menus
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete menus
CREATE POLICY "Only admins can delete menus"
  ON menus
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW
  EXECUTE FUNCTION update_menus_updated_at();
