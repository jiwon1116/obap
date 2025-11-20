'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Restaurant, Menu, Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Edit, Trash2, Upload, X, Check } from 'lucide-react'

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenuForm, setShowMenuForm] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [uploading, setUploading] = useState(false)

  // Menu form state
  const [menuForm, setMenuForm] = useState({
    menu_name: '',
    price: 0,
    description: '',
    image_url: '',
    is_signature: false,
    is_available: true,
  })

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params
      setRestaurantId(resolvedParams.id)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (restaurantId) {
      checkAuth()
    }
  }, [restaurantId])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<Profile>()

    if (!profile || profile.role !== 'admin') {
      alert('관리자 권한이 필요합니다')
      router.push('/')
      return
    }

    setProfile(profile)
    await fetchRestaurant()
    await fetchMenus()
    setLoading(false)
  }

  const fetchRestaurant = async () => {
    if (!restaurantId) return

    const response = await fetch(`/api/restaurants/${restaurantId}`)
    if (response.ok) {
      const data = await response.json()
      setRestaurant(data)
    }
  }

  const fetchMenus = async () => {
    if (!restaurantId) return

    const response = await fetch(`/api/menus?restaurant_id=${restaurantId}`)
    if (response.ok) {
      const data = await response.json()
      setMenus(data.menus || [])
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload-menu-image', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setMenuForm({ ...menuForm, image_url: data.url })
      } else {
        alert('이미지 업로드 실패')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('이미지 업로드 중 오류 발생')
    } finally {
      setUploading(false)
    }
  }

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!restaurantId) return

    try {
      const url = editingMenu ? `/api/menus/${editingMenu.id}` : '/api/menus'
      const method = editingMenu ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...menuForm,
          restaurant_id: restaurantId,
        }),
      })

      if (response.ok) {
        alert(editingMenu ? '메뉴가 수정되었습니다' : '메뉴가 추가되었습니다')
        await fetchMenus()
        setShowMenuForm(false)
        setEditingMenu(null)
        setMenuForm({
          menu_name: '',
          price: 0,
          description: '',
          image_url: '',
          is_signature: false,
          is_available: true,
        })
      } else {
        const error = await response.json()
        alert(error.error || '메뉴 저장 실패')
      }
    } catch (error) {
      console.error('Menu save error:', error)
      alert('메뉴 저장 중 오류 발생')
    }
  }

  const handleEditMenu = (menu: Menu) => {
    setEditingMenu(menu)
    setMenuForm({
      menu_name: menu.menu_name,
      price: menu.price,
      description: menu.description || '',
      image_url: menu.image_url || '',
      is_signature: menu.is_signature,
      is_available: menu.is_available,
    })
    setShowMenuForm(true)
  }

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/menus/${menuId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('메뉴가 삭제되었습니다')
        await fetchMenus()
      } else {
        alert('메뉴 삭제 실패')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('메뉴 삭제 중 오류 발생')
    }
  }

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃 중 오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>식당을 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/restaurants')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              <p className="text-sm text-gray-600">{restaurant.category}</p>
            </div>
            <button
              onClick={() => {
                sessionStorage.setItem('viewMainPage', 'true')
                router.push('/')
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              지도 보기
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* 식당 정보 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">식당 정보</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">주소:</span> {restaurant.address}</p>
            {restaurant.phone && <p><span className="font-medium">전화:</span> {restaurant.phone}</p>}
            {restaurant.price_tier && <p><span className="font-medium">가격대:</span> {restaurant.price_tier}</p>}
            {restaurant.description && <p><span className="font-medium">설명:</span> {restaurant.description}</p>}
          </div>
        </div>

        {/* 메뉴 관리 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">메뉴 관리</h2>
            <button
              onClick={() => {
                setShowMenuForm(true)
                setEditingMenu(null)
                setMenuForm({
                  menu_name: '',
                  price: 0,
                  description: '',
                  image_url: '',
                  is_signature: false,
                  is_available: true,
                })
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus size={20} />
              메뉴 추가
            </button>
          </div>

          {/* 메뉴 폼 */}
          {showMenuForm && (
            <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">
                  {editingMenu ? '메뉴 수정' : '새 메뉴 추가'}
                </h3>
                <button
                  onClick={() => {
                    setShowMenuForm(false)
                    setEditingMenu(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleMenuSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">메뉴명 *</label>
                  <input
                    type="text"
                    value={menuForm.menu_name}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, menu_name: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">가격 (원) *</label>
                  <input
                    type="number"
                    value={menuForm.price}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, price: parseInt(e.target.value) })
                    }
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">설명</label>
                  <textarea
                    value={menuForm.description}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">이미지</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {uploading && <span className="text-sm text-gray-500">업로드 중...</span>}
                  </div>
                  {menuForm.image_url && (
                    <img
                      src={menuForm.image_url}
                      alt="Preview"
                      className="mt-2 w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={menuForm.is_signature}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, is_signature: e.target.checked })
                      }
                    />
                    <span className="text-sm">대표 메뉴</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={menuForm.is_available}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, is_available: e.target.checked })
                      }
                    />
                    <span className="text-sm">판매 중</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  {editingMenu ? '수정하기' : '추가하기'}
                </button>
              </form>
            </div>
          )}

          {/* 메뉴 목록 */}
          <div className="space-y-3">
            {menus.length === 0 ? (
              <p className="text-center text-gray-500 py-8">등록된 메뉴가 없습니다</p>
            ) : (
              menus.map((menu) => (
                <div
                  key={menu.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex gap-4">
                    {menu.image_url && (
                      <img
                        src={menu.image_url}
                        alt={menu.menu_name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold flex items-center gap-2">
                            {menu.menu_name}
                            {menu.is_signature && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                대표
                              </span>
                            )}
                            {!menu.is_available && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                품절
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {menu.price.toLocaleString()}원
                          </p>
                          {menu.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {menu.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditMenu(menu)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteMenu(menu.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
