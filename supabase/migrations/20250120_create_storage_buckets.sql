-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view menu images (public bucket)
CREATE POLICY "Public menu images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Policy: Only admins can upload menu images
CREATE POLICY "Only admins can upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'menu-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update menu images
CREATE POLICY "Only admins can update menu images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'menu-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete menu images
CREATE POLICY "Only admins can delete menu images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'menu-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
