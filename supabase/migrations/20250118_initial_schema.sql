-- 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('employee', 'guest')),
  company_domain TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 프로필만 읽을 수 있음
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 정책: 사용자는 자신의 프로필만 수정할 수 있음
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 정책: 인증된 사용자는 프로필을 생성할 수 있음
CREATE POLICY "Authenticated users can create profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 이메일로 도메인 추출하는 함수
CREATE OR REPLACE FUNCTION get_email_domain(email TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN SPLIT_PART(email, '@', 2);
END;
$$ LANGUAGE plpgsql;

-- 공개 이메일 서비스인지 확인하는 함수
CREATE OR REPLACE FUNCTION is_public_email_domain(domain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 공개 이메일 서비스 도메인 목록
  RETURN domain IN (
    'gmail.com',
    'naver.com',
    'daum.net',
    'kakao.com',
    'hanmail.net',
    'yahoo.com',
    'yahoo.co.kr',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'icloud.com',
    'nate.com',
    'korea.com'
  );
END;
$$ LANGUAGE plpgsql;

-- 도메인이 영문으로만 구성되어 있는지 확인하는 함수
CREATE OR REPLACE FUNCTION is_english_domain(domain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 영문, 숫자, 하이픈, 점만 허용 (한글 등 다른 문자 제외)
  RETURN domain ~ '^[a-zA-Z0-9.-]+$';
END;
$$ LANGUAGE plpgsql;

-- 사용자 가입 시 자동으로 프로필 생성 및 역할 설정하는 트리거 함수
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

  -- metadata에서 username과 nickname 추출 (없으면 기본값 사용)
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

-- 사용자 생성 시 트리거 등록
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 프로필 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
