import { MapContainer, TileLayer, useMap, LayerGroup, Polyline, CircleMarker, Marker, Polygon } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { Compass, Focus, Map as MapIcon, Maximize2, Minimize2, Search, Crosshair, Users, Activity, Layers, LocateFixed, Plus, Minus } from 'lucide-react'
import { getAvatarUrl } from '../api/fleetApi'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import AnimatedMarker from './AnimatedMarker'
import { BASE_URL } from '../api/fleetApi'
import { useTheme } from '../context/ThemeContext'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

/**
 * GeofenceDrawer — integrates Geoman drawing tools.
 */
function GeofenceDrawer({ isDrawingGeofence, onCancelDrawing, onGeofenceDrawn }) {
  const map = useMap()

  useEffect(() => {
    if (isDrawingGeofence) {
      map.pm.enableDraw('Polygon', {
        snappable: true,
        snapDistance: 20,
      })

      const handleCreate = (e) => {
        const layer = e.layer
        const latlngs = layer.getLatLngs()[0] // Outer ring
        const coordinates = latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng }))
        
        if (onGeofenceDrawn) {
          onGeofenceDrawn(coordinates)
        }
        
        map.removeLayer(layer)
        map.pm.disableDraw()
      }

      map.on('pm:create', handleCreate)

      return () => {
        map.off('pm:create', handleCreate)
        map.pm.disableDraw()
      }
    } else {
      map.pm.disableDraw()
    }
  }, [map, isDrawingGeofence, onCancelDrawing, onGeofenceDrawn])

  return null
}

/**
 * MapFlyTo — imperative component to pan/zoom to a vehicle when selected.
 * Only triggers when selectedVehicle.id changes so the user can zoom and pan freely.
 */
function MapFlyTo({ vehicleId, position }) {
  const map = useMap()
  const lastVehicleIdRef = useRef(null)

  useEffect(() => {
    if (vehicleId && vehicleId !== lastVehicleIdRef.current && position) {
      lastVehicleIdRef.current = vehicleId
      map.flyTo(position, 18, { duration: 1.2 })
    } else if (!vehicleId) {
      lastVehicleIdRef.current = null
    }
  }, [map, vehicleId, position])

  return null
}

/**
 * CustomMapControls — Unified control panel replacing default Leaflet controls.
 */
function CustomMapControls({ showOwnerLocation, onToggleOwnerLocation }) {
  const map = useMap()
  const { mapTheme, setMapTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const zoomRef = useRef(null)
  const topRightRef = useRef(null)
  const bottomRightRef = useRef(null)

  useEffect(() => {
    [zoomRef, topRightRef, bottomRightRef].forEach(ref => {
      if (ref.current) {
        L.DomEvent.disableClickPropagation(ref.current)
        L.DomEvent.disableScrollPropagation(ref.current)
      }
    })
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setTimeout(() => map.invalidateSize(), 100)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [map])

  const toggleFullscreen = () => {
    const container = map.getContainer()
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const themes = ['Satellite', 'Dark Mode', 'Light Mode']
  const cycleTheme = () => {
    const nextIdx = (themes.indexOf(mapTheme) + 1) % themes.length
    setMapTheme(themes[nextIdx])
  }

  const btnClass = "flex items-center justify-center w-9 h-9 md:w-[42px] md:h-[42px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0 cursor-pointer"
  const iconClass = "w-[18px] h-[18px] md:w-5 md:h-5"

  return (
    <>
      {/* Top Left: Zoom Controls */}
      <div className="leaflet-top leaflet-left absolute z-[1000] top-2 left-2 md:top-4 md:left-4">
        <div ref={zoomRef} className="leaflet-control flex flex-col rounded shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ pointerEvents: 'auto' }}>
          <button onClick={(e) => { e.preventDefault(); map.zoomIn() }} className={btnClass} title="Zoom In">
            <Plus className={iconClass} />
          </button>
          <button onClick={(e) => { e.preventDefault(); map.zoomOut() }} className={btnClass} title="Zoom Out">
            <Minus className={iconClass} />
          </button>
        </div>
      </div>

      {/* Top Right: Theme & Full Screen */}
      <div className="leaflet-top leaflet-right absolute z-[1000] top-2 right-2 md:top-4 md:right-4">
        <div ref={topRightRef} className="leaflet-control flex flex-col rounded shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ pointerEvents: 'auto' }}>
          <button onClick={(e) => { e.preventDefault(); cycleTheme() }} className={btnClass} title={`Map Theme: ${mapTheme}`}>
            <Layers className={iconClass} />
          </button>
          <button onClick={(e) => { e.preventDefault(); toggleFullscreen() }} className={btnClass} title={isFullscreen ? "Exit Full Screen" : "Full Screen"}>
            {isFullscreen ? <Minimize2 className={iconClass} /> : <Maximize2 className={iconClass} />}
          </button>
        </div>
      </div>

      {/* Bottom Right: Show My Location */}
      {onToggleOwnerLocation && (
        <div className="leaflet-bottom leaflet-right absolute z-[1000] bottom-4 right-2 md:bottom-6 md:right-4">
          <div ref={bottomRightRef} className="leaflet-control flex flex-col rounded shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ pointerEvents: 'auto' }}>
            <button onClick={(e) => { e.preventDefault(); onToggleOwnerLocation() }} className={btnClass} title={showOwnerLocation ? "Hide My Location" : "Show My Location"}>
              <LocateFixed className={`${iconClass} ${showOwnerLocation ? "text-brand-primary dark:text-[#17b385]" : ""}`} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * FleetMap — Leaflet map showing all vehicle markers with smooth
 * real-time interpolation between GPS pings and breadcrumb route trails.
 */
export default function FleetMap({ children, vehicles, locations, locationHistory, selectedVehicle, followedVehicleId, lastWsMessage, onInterpolatedPositions, ownerLocation, ownerUser, geofences, isDashboard, isDrawingGeofence, onCancelDrawing, onGeofenceDrawn, selectedGeofence, onGeofenceClick, showOwnerLocation, onToggleOwnerLocation }) {
  const [userCenter, setUserCenter] = useState(null)
  const { isDarkMode, mapTheme } = useTheme()
  const navigate = useNavigate()

  // Track interpolated positions so the Dashboard overlay can show live coords
  const interpolatedRef = useRef({})

  const handleInterpolatedPosition = useCallback((vehicleId, lat, lng) => {
    interpolatedRef.current[vehicleId] = { latitude: lat, longitude: lng }
    if (onInterpolatedPositions) {
      onInterpolatedPositions({ ...interpolatedRef.current })
    }
  }, [onInterpolatedPositions])

  useEffect(() => {
    if (navigator.geolocation && Object.keys(locations).length === 0) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      )
    }
  }, [locations])

  const DEFAULT_CENTER = [20.0, 78.0]
  const DEFAULT_ZOOM   = 5

  const firstLocation = Object.values(locations)[0]
  const initialCenter = firstLocation
    ? [firstLocation.matched_latitude ?? firstLocation.latitude, firstLocation.matched_longitude ?? firstLocation.longitude]
    : (userCenter || DEFAULT_CENTER)
  const initialZoom = (firstLocation || userCenter) ? 13 : DEFAULT_ZOOM

  const flyTarget = selectedVehicle && locations[selectedVehicle.id]
      ? [
          locations[selectedVehicle.id].matched_latitude ?? locations[selectedVehicle.id].latitude, 
          locations[selectedVehicle.id].matched_longitude ?? locations[selectedVehicle.id].longitude
        ]
      : null


  let ownerAvatarUrl = getAvatarUrl(ownerUser?.avatar_url)

  const ownerIcon = useMemo(() => {
    if (!ownerUser) return null;
    return L.divIcon({
      className: 'bg-transparent',
      html: `
        <div class="relative w-10 h-10">
          <div class="absolute inset-0 rounded-full border-2 border-[#17b385] overflow-hidden bg-white shadow-md z-10 flex items-center justify-center">
            <img src="${ownerAvatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(ownerUser.full_name || 'Owner') + '&background=f1f5f9&color=64748b'}" 
                 class="w-full h-full object-cover" 
                 alt="Owner" />
          </div>
          <div class="absolute inset-0 rounded-full bg-[#17b385] radar-animation z-0"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
  }, [ownerUser, ownerAvatarUrl])

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <CustomMapControls showOwnerLocation={showOwnerLocation} onToggleOwnerLocation={onToggleOwnerLocation} />
      <GeofenceDrawer isDrawingGeofence={isDrawingGeofence} onCancelDrawing={onCancelDrawing} onGeofenceDrawn={onGeofenceDrawn} />
      
      {mapTheme === 'Satellite' && (
        <LayerGroup>
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />
        </LayerGroup>
      )}



      {mapTheme === 'Dark Mode' && (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-map-tiles"
        />
      )}

      {mapTheme === 'Light Mode' && (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}

      {flyTarget && <MapFlyTo vehicleId={selectedVehicle?.id} position={flyTarget} />}

      {geofences && geofences.map(gf => {
        const isSelected = selectedGeofence?.id === gf.id
        const baseColor = gf.color || '#17b385'
        
        return (
          <Polygon 
            key={gf.id} 
            positions={gf.coordinates} 
            pathOptions={{ 
              color: isSelected ? '#f59e0b' : baseColor, 
              fillColor: isSelected ? '#f59e0b' : baseColor, 
              fillOpacity: isSelected ? 0.4 : 0.2,
              weight: isSelected ? 3 : 2
            }}
            eventHandlers={{
              click: () => {
                if (onGeofenceClick) onGeofenceClick(gf)
              }
            }}
          />
        )
      })}

      {vehicles.map((vehicle) => {
        const loc = locations[vehicle.id]
        if (!loc) return null

        const isSelected = selectedVehicle?.id === vehicle.id

        return (
          <LayerGroup key={vehicle.id}>
            <AnimatedMarker
              vehicle={vehicle}
              location={loc}
              isSelected={isSelected}
              isFollowed={followedVehicleId === vehicle.id}
              onInterpolatedPosition={handleInterpolatedPosition}
            />
          </LayerGroup>
        )
      })}

      {ownerLocation && ownerUser && ownerIcon && (
        <LayerGroup key="owner-marker">
          <Marker 
            position={[ownerLocation.latitude, ownerLocation.longitude]} 
            icon={ownerIcon}
            zIndexOffset={1000}
          />
        </LayerGroup>
      )}

      {children}
    </MapContainer>
  )
}
