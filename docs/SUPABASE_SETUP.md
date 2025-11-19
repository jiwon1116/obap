# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속
2. 새 프로젝트 생성
3. 프로젝트 URL과 API Key를 `.env.local`에 저장

## 2. 데이터베이스 스키마 생성

Supabase Dashboard → SQL Editor로 이동하여 다음 파일의 SQL을 실행하세요:

```
supabase/migrations/20250118_initial_schema.sql
```

또는 아래 단계를 따라 하세요:

### Step 1: SQL Editor에서 실행

1. Supabase Dashboard 접속
2. 왼쪽 메뉴에서 "SQL Editor" 클릭
3. `supabase/migrations/20250118_initial_schema.sql` 파일의 내용을 복사
4. SQL Editor에 붙여넣기
5. "Run" 버튼 클릭

### Step 2: 스키마 확인

다음 테이블과 함수가 생성되었는지 확인:

**테이블:**
- `profiles` - 사용자 프로필 정보

**함수:**
- `get_email_domain()` - 이메일에서 도메인 추출
- `is_public_email_domain()` - 공개 이메일 서비스 확인
- `handle_new_user()` - 사용자 가입 시 자동 프로필 생성 및 역할 할당

**트리거:**
- `on_auth_user_created` - 사용자 생성 시 자동 실행

## 3. 이메일 인증 설정

### Step 1: Email 인증 활성화

1. Supabase Dashboard → Authentication → Providers
2. **Email** 프로바이더 활성화
3. **Confirm email** 옵션 활성화 (이메일 OTP 사용)

### Step 2: Email Templates 설정

1. Supabase Dashboard → Authentication → Email Templates
2. "Confirm signup" 템플릿 선택
3. OTP 코드가 포함되어 있는지 확인: `{{ .Token }}`

### Step 3: URL Configuration

1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL**: `http://localhost:3001` (개발) 또는 프로덕션 URL
3. **Redirect URLs**에 추가:
   - `http://localhost:3001/auth/callback`
   - `https://yourdomain.com/auth/callback` (프로덕션)

## 4. 직장인 인증 방식

**블랙리스트 + 영문 도메인 방식**을 사용합니다:

- ✅ **회사 이메일** (영문 도메인, 공개 이메일 아님) → 직장인 (employee)
- ❌ **공개 이메일** → 게스트 (guest)
- ❌ **한글 도메인** → 게스트 (guest)

### 차단되는 공개 이메일 서비스:

- gmail.com, naver.com, daum.net, kakao.com
- hanmail.net, yahoo.com, outlook.com, hotmail.com
- live.com, icloud.com, nate.com, korea.com

### 공개 도메인 추가 방법:

추가로 차단할 공개 이메일 도메인이 있다면:

1. `lib/auth/profile.ts`의 `PUBLIC_EMAIL_DOMAINS` 배열에 추가
2. `supabase/migrations/20250118_initial_schema.sql`의 `is_public_email_domain()` 함수에 추가

## 5. Row Level Security (RLS) 정책 확인

`profiles` 테이블에 다음 RLS 정책이 활성화되어 있는지 확인:

1. **Users can read own profile** - 자신의 프로필 읽기
2. **Users can update own profile** - 자신의 프로필 수정
3. **Authenticated users can create profile** - 프로필 생성

## 6. 테스트

### 회원가입 테스트

#### 직장인 계정 (회사 이메일)
1. `/signup` 페이지 접속
2. 회사 이메일 입력 (예: `yourname@yourcompany.com`)
3. 아이디, 닉네임, 비밀번호 입력
4. 회원가입 버튼 클릭
5. 이메일함에서 6자리 OTP 코드 확인
6. 인증 코드 입력하여 이메일 인증 완료
7. 로그인 후 홈 페이지에서 "직장인" 배지 확인
8. 직장인 전용 기능이 활성화되어 있는지 확인

**예시 회사 이메일:**
- `test@strap.build` ✅ (영문 도메인)
- `test@samsung.com` ✅ (영문 도메인)
- `test@anycompany.co.kr` ✅ (영문 도메인)
- `test@회사.com` ❌ (한글 도메인 - 게스트로 처리됨)

#### 게스트 계정 (공개 이메일)
1. `/signup` 페이지 접속
2. 공개 이메일 입력 (예: `test@gmail.com`)
3. 아이디, 닉네임, 비밀번호 입력
4. 회원가입 버튼 클릭
5. 이메일함에서 6자리 OTP 코드 확인
6. 인증 코드 입력하여 이메일 인증 완료
7. 로그인 후 홈 페이지에서 "게스트" 배지 확인
8. 직장인 전용 기능이 잠겨있는지 확인

**공개 이메일 예시:**
- `test@gmail.com`
- `test@naver.com`
- `test@daum.net`

### 로그인 테스트
1. `/login` 페이지 접속
2. 이메일과 비밀번호 입력
3. 로그인 버튼 클릭
4. 홈 페이지로 리다이렉트 확인

## 7. 프로덕션 배포 시

1. Supabase Dashboard → Settings → API
2. `service_role` key를 `.env.local`에 추가 (서버 기능용)
3. URL Configuration에 프로덕션 URL 추가
4. Email Templates의 링크 확인

## 문제 해결

### 프로필이 자동 생성되지 않는 경우

SQL Editor에서 트리거 확인:

```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### RLS 오류가 발생하는 경우

SQL Editor에서 정책 확인:

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### 역할 할당이 제대로 작동하지 않는 경우

공개 이메일 도메인 함수 확인:

```sql
-- 테스트: gmail.com은 true를 반환해야 함
SELECT is_public_email_domain('gmail.com');

-- 테스트: 회사 도메인은 false를 반환해야 함
SELECT is_public_email_domain('yourcompany.com');
```

트리거 함수 확인:

```sql
SELECT proname, prosrc FROM pg_proc
WHERE proname = 'handle_new_user';
```
