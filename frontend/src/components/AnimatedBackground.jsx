import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function AnimatedBackground({ children, centerContent = true }) {
  const { isDarkMode } = useTheme()
  const location = useLocation()
  // Center on a major city (New York)
  const center = [40.7128, -74.0060]

  return (
    <div className="relative h-full w-full bg-slate-50 dark:bg-slate-950 transition-colors overflow-y-auto scrollbar-hide">

      {/* Background Map Layer */}
      <div className="fixed inset-0 z-0">
        <MapContainer
          center={center}
          zoom={13}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          attributionControl={false}
          className="w-full h-full"
          style={{ background: isDarkMode ? '#020617' : '#f8fafc' }}
        >
          {/* CartoDB Map Layer */}
          <TileLayer
            key={isDarkMode ? 'dark' : 'light'}
            url={isDarkMode
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            }
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />
        </MapContainer>

        {/* Overlay to ensure content is readable on top of the map */}
        <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-950/80 pointer-events-none z-[400] transition-colors" />
      </div>

      {/* Content wrapper */}
      <div className={`relative z-10 w-full min-h-full ${centerContent ? 'flex items-center justify-center p-4' : ''}`}>
        {children}
      </div>
    </div>
  )
}
