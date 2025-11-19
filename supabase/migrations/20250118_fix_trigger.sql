-- 트리거 함수를 더 안전하게 수정 (에러 처리 추가)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_domain TEXT;
  is_employee BOOLEAN;
  user_username TEXT;
  user_nickname TEXT;
BEGIN
  -- 이메일에서 도메인 추출
  user_domain := get_email_domain(NEW.email);

  -- metadata에서 username과 nickname 추출
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  user_nickname := COALESCE(NEW.raw_user_meta_data->>'nickname', user_username);

  -- 공개 이메일이 아니면서 영문 도메인인 경우만 직장인으로 간주
  is_employee := NOT is_public_email_domain(user_domain) AND is_english_domain(user_domain);

  -- 프로필 생성
  INSERT INTO profiles (id, email, username, nickname, role, company_domain)
  VALUES (
    NEW.id,
    NEW.email,
    user_username,
    user_nickname,
    CASE WHEN is_employee THEN 'employee' ELSE 'guest' END,
    CASE WHEN is_employee THEN user_domain ELSE NULL END
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생 시 로그에 기록하고 계속 진행
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
