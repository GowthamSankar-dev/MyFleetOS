import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, LayerGroup, Polyline, Marker, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Play, Pause, FastForward, Maximize2, Minimize2, Layers, X, SkipBack, Crosshair } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/**
 * CustomMapControls — extracted from FleetMap to reuse Theme and Fullscreen logic
 */
function CustomMapControls({ isFullscreen, onToggleFullscreen }) {
  const map = useMap()
  const { mapTheme, setMapTheme } = useTheme()

  const topRightRef = useRef(null)

  useEffect(() => {
    if (topRightRef.current) {
      L.DomEvent.disableClickPropagation(topRightRef.current)
      L.DomEvent.disableScrollPropagation(topRightRef.current)
    }
  }, [])

  const themes = ['Satellite', 'OpenStreetMap', 'Dark Mode', 'Light Mode']
  const cycleTheme = () => {
    const nextIdx = (themes.indexOf(mapTheme) + 1) % themes.length
    setMapTheme(themes[nextIdx])
  }

  const btnClass = "flex items-center justify-center w-9 h-9 md:w-[42px] md:h-[42px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-200 dark:border-slate-700 last:border-b-0 cursor-pointer"
  const iconClass = "w-[18px] h-[18px] md:w-5 md:h-5"

  return (
    <div className="leaflet-top leaflet-right absolute z-[1000] top-2 right-2 md:top-4 md:right-4">
      <div ref={topRightRef} className="leaflet-control flex flex-col rounded shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ pointerEvents: 'auto' }}>
        <button onClick={(e) => { e.preventDefault(); cycleTheme() }} className={btnClass} title={`Map Theme: ${mapTheme}`}>
          <Layers className={iconClass} />
        </button>
        <button onClick={(e) => { e.preventDefault(); onToggleFullscreen() }} className={btnClass} title={isFullscreen ? "Exit Full Screen" : "Full Screen"}>
          {isFullscreen ? <Minimize2 className={iconClass} /> : <Maximize2 className={iconClass} />}
        </button>
      </div>
    </div>
  )
}

/**
 * PlaybackMap — Standalone playback map with transport controls.
 */
export default function PlaybackMap({ locations, geofences, onClose }) {
  const { mapTheme } = useTheme()
  const wrapperRef = useRef(null)
  const mapRef = useRef(null)
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [progress, setProgress] = useState(0) // 0 to 100
  const [isFollowed, setIsFollowed] = useState(false)

  const stateRef = useRef({
    isPlaying: true,
    speed: 1,
    progress: 0,
    isFollowed: false,
    lastTime: performance.now(),
    lastUiUpdateTime: 0
  })
  
  const markerRef = useRef(null)
  const controlsRef = useRef(null)

  // Prevent map interaction events falling through the custom control overlay
  useEffect(() => {
    if (controlsRef.current) {
      L.DomEvent.disableClickPropagation(controlsRef.current)
      L.DomEvent.disableScrollPropagation(controlsRef.current)
    }
  }, [])

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (mapRef.current) {
        setTimeout(() => mapRef.current.invalidateSize(), 100)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    const container = wrapperRef.current
    if (!container) return
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) container.requestFullscreen()
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
    }
  }

  // Sync React state to animation Ref
  useEffect(() => {
    if (isPlaying && !stateRef.current.isPlaying) {
      // Prevent massive delta jump if user waited before clicking play
      stateRef.current.lastTime = performance.now()
    }
    stateRef.current.isPlaying = isPlaying
    stateRef.current.speed = speed
    stateRef.current.isFollowed = isFollowed
    // If progress is changed manually, update the ref
    if (Math.abs(stateRef.current.progress * 100 - progress) > 1) {
      stateRef.current.progress = progress / 100
    }
  }, [isPlaying, speed, progress, isFollowed])

  // Animation Loop
  useEffect(() => {
    if (!locations || locations.length < 2) return
    
    let animId
    const DURATION_PER_SEGMENT = 1000 // base 1 second per segment
    const totalSegments = locations.length - 1
    const totalDuration = totalSegments * DURATION_PER_SEGMENT
    
    stateRef.current.lastTime = performance.now()

    const animate = (time) => {
      const state = stateRef.current
      const delta = time - state.lastTime
      state.lastTime = time

      if (state.isPlaying) {
        state.progress += (delta * state.speed) / totalDuration
        if (state.progress >= 1) {
          state.progress = 1
          state.isPlaying = false
          setIsPlaying(false)
        }
      }

      const currentElapsed = state.progress * totalDuration
      const currentSegment = Math.min(Math.floor(currentElapsed / DURATION_PER_SEGMENT), totalSegments - 1)
      let segmentProgress = (currentElapsed % DURATION_PER_SEGMENT) / DURATION_PER_SEGMENT
      
      if (state.progress >= 1) {
        segmentProgress = 1
      }

      const p1 = locations[currentSegment]
      const p2 = locations[currentSegment + 1] || p1

      const lat = p1.latitude + (p2.latitude - p1.latitude) * segmentProgress
      const lng = p1.longitude + (p2.longitude - p1.longitude) * segmentProgress

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      }

      if (state.isFollowed && mapRef.current) {
        mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: false })
      }

      // Throttle React state updates to 10 FPS
      if (time - state.lastUiUpdateTime > 100) {
        state.lastUiUpdateTime = time
        setProgress(state.progress * 100)
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animId)
  }, [locations])

  const initialCenter = locations && locations.length > 0 
    ? [locations[0].latitude, locations[0].longitude] 
    : [20.0, 78.0]

  const icon = L.divIcon({
    className: 'bg-transparent',
    html: `<div style="width: 24px; height: 24px; border-radius: 50%; background: #17b385; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })

  const cycleSpeed = () => {
    const speeds = [1, 2, 5, 10]
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length
    setSpeed(speeds[nextIdx])
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-slate-100 dark:bg-slate-900">
      <MapContainer
        center={initialCenter}
        zoom={15}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
      >
        <CustomMapControls isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
        
        {mapTheme === 'Satellite' && (
          <LayerGroup>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
          </LayerGroup>
        )}
        {mapTheme === 'OpenStreetMap' && (
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        )}
        {mapTheme === 'Dark Mode' && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        )}
        {mapTheme === 'Light Mode' && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        )}

        {locations && locations.length > 0 && (
          <LayerGroup>
            <Polyline 
              positions={locations.map(l => [l.latitude, l.longitude])}
              pathOptions={{ color: '#17b385', weight: 4, opacity: 0.7 }}
            />
            <Marker ref={markerRef} position={initialCenter} icon={icon} zIndexOffset={2000} />
          </LayerGroup>
        )}

        {geofences && geofences.map(gf => {
          const baseColor = gf.color || '#17b385'
          
          return (
            <Polygon 
              key={gf.id} 
              positions={gf.coordinates} 
              pathOptions={{ 
                color: baseColor, 
                fillColor: baseColor, 
                fillOpacity: 0.2,
                weight: 2
              }}
            />
          )
        })}
      </MapContainer>

      {/* Transport Controls Overlay */}
      <div 
        ref={controlsRef}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded p-4 z-[2000] flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (!isPlaying && progress >= 100) {
                setProgress(0)
                stateRef.current.progress = 0
                setIsPlaying(true)
              } else {
                setIsPlaying(!isPlaying)
              }
            }}
            className="w-12 h-12 rounded-full bg-brand-primary dark:bg-[#17b385] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</span>
              <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300">
                {Math.round(progress)}%
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.1"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              className="w-full accent-brand-primary dark:accent-[#17b385]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => { setProgress(0); setIsPlaying(true); }}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Restart"
            >
              <SkipBack size={16} />
            </button>
            <button 
              onClick={cycleSpeed}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold text-xs flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Speed"
            >
              {speed}x
            </button>
            <button 
              onClick={() => setIsFollowed(!isFollowed)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${isFollowed ? 'bg-brand-primary/20 text-brand-primary dark:bg-[#17b385]/20 dark:text-[#17b385] border border-brand-primary/50 dark:border-[#17b385]/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              title="Toggle Map Follow"
            >
              <Crosshair size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-[2000] w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X size={20} />
      </button>
    </div>
  )
}
