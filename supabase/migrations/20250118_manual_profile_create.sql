-- 기존 사용자들의 프로필을 수동으로 생성하는 스크립트
-- 1. 먼저 auth.users에 있지만 profiles에 없는 사용자 확인
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'username' as username,
  u.raw_user_meta_data->>'nickname' as nickname
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 2. 위에서 확인한 사용자들의 프로필을 수동으로 생성
INSERT INTO profiles (id, email, username, nickname, role, company_domain)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) as username,
  COALESCE(u.raw_user_meta_data->>'nickname', split_part(u.email, '@', 1)) as nickname,
  CASE
    WHEN NOT is_public_email_domain(split_part(u.email, '@', 2))
         AND is_english_domain(split_part(u.email, '@', 2))
    THEN 'employee'
    ELSE 'guest'
  END as role,
  CASE
    WHEN NOT is_public_email_domain(split_part(u.email, '@', 2))
         AND is_english_domain(split_part(u.email, '@', 2))
    THEN split_part(u.email, '@', 2)
    ELSE NULL
  END as company_domain
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
