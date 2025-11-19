/**
 * 이메일에서 도메인을 추출합니다
 */
export function getEmailDomain(email: string): string {
  return email.split('@')[1] || ''
}

/**
 * 공개 이메일 서비스 도메인 목록
 */
const PUBLIC_EMAIL_DOMAINS = [
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
  'korea.com',
]

/**
 * 공개 이메일 서비스인지 확인합니다
 */
export function isPublicEmail(email: string): boolean {
  const domain = getEmailDomain(email)
  return PUBLIC_EMAIL_DOMAINS.includes(domain)
}

/**
 * 도메인이 영문으로만 구성되어 있는지 확인합니다
 */
export function isEnglishDomain(domain: string): boolean {
  // 영문, 숫자, 하이픈, 점만 허용 (한글 등 다른 문자 제외)
  const englishDomainRegex = /^[a-zA-Z0-9.-]+$/
  return englishDomainRegex.test(domain)
}

/**
 * 회사 이메일인지 확인합니다 (공개 이메일이 아니면서 영문 도메인인 경우)
 */
export function isCompanyEmail(email: string): boolean {
  const domain = getEmailDomain(email)
  return !isPublicEmail(email) && isEnglishDomain(domain)
}
