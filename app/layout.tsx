import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'O!BAP - 오밥',
  description: '직장인을 위한 맛집 지도',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          strategy="beforeInteractive"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        />
        <Script strategy="afterInteractive" src="/marker-clustering.js" />
        <Script
          strategy="afterInteractive"
          id="marker-clustering-init"
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(function() {
                if (typeof window !== 'undefined' && window.naver && window.MarkerClustering) {
                  window.naver.maps.MarkerClustering = window.MarkerClustering;
                  console.log('✅ MarkerClustering 로드 완료');
                }
              }, 100);
            `,
          }}
        />
      </body>
    </html>
  )
}
