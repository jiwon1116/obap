/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 네이버 지도 API 타입 정의
 * 참고: https://navermaps.github.io/maps.js.ncp/docs/
 */

declare namespace naver.maps {
  class Map {
    constructor(element: HTMLElement | string, options?: MapOptions)
    setCenter(center: LatLng | LatLngLiteral): void
    getCenter(): LatLng
    setZoom(level: number, useEffect?: boolean): void
    getZoom(): number
    destroy(): void
    panTo(coord: LatLng | LatLngLiteral, duration?: number): void
    fitBounds(bounds: LatLngBounds, options?: any): void
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral
    zoom?: number
    minZoom?: number
    maxZoom?: number
    zoomControl?: boolean
    zoomControlOptions?: {
      position?: Position
      style?: any
    }
    mapTypeControl?: boolean
    scaleControl?: boolean
    logoControl?: boolean
    mapDataControl?: boolean
  }

  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
    equals(other: LatLng): boolean
  }

  interface LatLngLiteral {
    lat: number
    lng: number
  }

  class LatLngBounds {
    constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral)
    extend(coord: LatLng | LatLngLiteral): LatLngBounds
    getCenter(): LatLng
    getSW(): LatLng
    getNE(): LatLng
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getMap(): Map | null
    setPosition(position: LatLng | LatLngLiteral): void
    getPosition(): LatLng
    setTitle(title: string): void
    getTitle(): string
    setIcon(icon: string | ImageIcon): void
    setVisible(visible: boolean): void
  }

  interface MarkerOptions {
    position: LatLng | LatLngLiteral
    map?: Map
    title?: string
    icon?: string | ImageIcon
    clickable?: boolean
    draggable?: boolean
    visible?: boolean
    zIndex?: number
  }

  interface ImageIcon {
    url: string
    size?: Size
    scaledSize?: Size
    origin?: Point
    anchor?: Point
  }

  class Size {
    constructor(width: number, height: number)
    width: number
    height: number
  }

  class Point {
    constructor(x: number, y: number)
    x: number
    y: number
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions)
    open(map: Map, anchor?: Marker | LatLng | LatLngLiteral): void
    close(): void
    setContent(content: string | HTMLElement): void
    getContent(): string | HTMLElement
  }

  interface InfoWindowOptions {
    content: string | HTMLElement
    position?: LatLng | LatLngLiteral
    maxWidth?: number
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    anchorSize?: Size
    anchorSkew?: boolean
    anchorColor?: string
    pixelOffset?: Point
  }

  enum Position {
    TOP_LEFT = 1,
    TOP_CENTER = 2,
    TOP_RIGHT = 3,
    LEFT_CENTER = 4,
    CENTER = 5,
    RIGHT_CENTER = 6,
    BOTTOM_LEFT = 7,
    BOTTOM_CENTER = 8,
    BOTTOM_RIGHT = 9,
  }

  namespace Event {
    function addListener(
      target: any,
      eventName: string,
      listener: (event: any) => void
    ): MapEventListener
    function removeListener(listener: MapEventListener): void
  }

  interface MapEventListener {
    target: any
    eventName: string
  }
}

declare namespace naver {
  export import maps = naver.maps
}
