# 네이버 지역검색 API 발급 가이드

## 현재 상황
- ✅ 네이버 Maps API (지도용) - 이미 있음
- ❌ 네이버 지역검색 API (식당 검색용) - 발급 필요

---

## 🚀 발급 방법

### 1단계: 네이버 개발자센터 접속
https://developers.naver.com/main/

### 2단계: 로그인
- 네이버 계정으로 로그인
- "Application" → "애플리케이션 등록"

### 3단계: 애플리케이션 등록
1. **애플리케이션 이름**: `O!BAP`
2. **사용 API**:
   - ✅ **검색** 체크
   - 하위 항목: **"지역"** 체크
3. **비로그인 오픈 API 서비스 환경**:
   - **Web 설정** 추가
   - URL: `http://localhost:3000` (개발용)
   - 나중에 배포 URL도 추가 (예: `https://obap.vercel.app`)

### 4단계: 등록 완료
- **Client ID** 복사
- **Client Secret** 복사

### 5단계: .env.local에 추가

기존 `.env.local`에 추가:

```bash
# 네이버 지역검색 API (새로 추가!)
NAVER_CLIENT_ID=복사한_Client_ID
NAVER_CLIENT_SECRET=복사한_Client_Secret
```

⚠️ **주의**: 이미 Maps API 키가 있다면, 검색 API 키로 **교체**하세요!

---

## 📊 네이버 vs 카카오 비교

| 항목 | 네이버 | 카카오 |
|------|--------|--------|
| **무료 할당량** | 25,000건/일 | 300,000건/일 |
| **발급 난이도** | 중간 | 쉬움 |
| **좌표 변환** | 필요 (KATEC → WGS84) | 불필요 |
| **데이터 품질** | 좋음 | 좋음 |
| **카테고리** | 간단 | 상세 |

---

## 🎯 사용 예시

### API 엔드포인트
```
GET https://openapi.naver.com/v1/search/local.json
```

### 요청 헤더
```
X-Naver-Client-Id: {CLIENT_ID}
X-Naver-Client-Secret: {CLIENT_SECRET}
```

### 쿼리 파라미터
- `query`: 검색어 (예: "구디 맛집")
- `display`: 결과 개수 (1~5, 기본 1)
- `start`: 시작 위치 (1~1000)
- `sort`: 정렬 (random 또는 comment)

### 응답 예시
```json
{
  "items": [
    {
      "title": "맛있는<b>식당</b>",
      "category": "한식>백반,죽,국수",
      "telephone": "02-123-4567",
      "address": "서울특별시 구로구 ...",
      "roadAddress": "서울특별시 구로구 디지털로 ...",
      "mapx": "1268958000",
      "mapy": "374824000",
      "link": "https://..."
    }
  ]
}
```

⚠️ **좌표 변환 필요**:
- `mapx`, `mapy`를 10,000,000으로 나누면 WGS84 좌표

---

## ✅ 발급 완료 후

`.env.local` 확인:
```bash
# 네이버 Maps (기존)
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=5kflrkvggd

# 네이버 지역검색 (새로 발급)
NAVER_CLIENT_ID=새로_발급받은_ID
NAVER_CLIENT_SECRET=새로_발급받은_SECRET
```

개발 서버 재시작:
```bash
# 터미널에서 Ctrl+C 후
npm run dev
```

---

## 📌 참고 링크

- 네이버 개발자센터: https://developers.naver.com/
- 지역검색 API 문서: https://developers.naver.com/docs/serviceapi/search/local/local.md
- 애플리케이션 관리: https://developers.naver.com/apps/#/list
