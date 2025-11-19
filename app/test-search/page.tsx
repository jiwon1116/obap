import PlaceSearch from '@/components/place-search'

export default function TestSearchPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            카카오 로컬 API 테스트
          </h1>
          <p className="text-gray-600 mt-2">
            음식점 이름이나 지역을 검색해보세요 (예: 강남 치킨, 홍대 피자)
          </p>
        </div>

        <PlaceSearch />
      </div>
    </main>
  )
}
