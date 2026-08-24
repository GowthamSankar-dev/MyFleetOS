import { RefreshCw, Search, Trash2, ArrowLeft, Plus, Flag, Github, Linkedin, Mail } from 'lucide-react'
import { useState } from 'react'
import { FenceIcon } from './icons/FenceIcon'
import GlobeLoader from './GlobeLoader'

/**
 * GeofenceList — scrollable panel listing geofences.
 */
export default function GeofenceList({ geofences, selectedGeofence, onSelect, onRefresh, isLoading, onToggleView, onAddGeofence, onDeleteGeofence }) {
  const [query, setQuery] = useState('')

  const filtered = geofences.filter((gf) =>
    gf.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <button
              onClick={onToggleView}
              className="p-1 -ml-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Back to Vehicles"
            >
              <ArrowLeft size={18} />
            </button>
            <span>Geofences</span>
            <span className="ml-1 text-sm text-slate-500 font-medium">
              ({geofences.length})
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onAddGeofence}
              className="p-1.5 rounded text-brand-primary dark:text-[#17b385] hover:bg-brand-primary/10 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Draw new geofence"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search geofences…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>
      </div>

      {/* ── Geofence items ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500">
            <GlobeLoader className="w-8 h-8 mb-2 opacity-70" />
            <p className="text-xs">Loading geofences…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500 text-center px-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">No geofences found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {geofences.length === 0
                ? 'Click Add to draw a new geofence on the map.'
                : 'Try typing a different name.'}
            </p>
          </div>
        ) : (
          filtered.map((gf) => {
            const isSelected = selectedGeofence?.id === gf.id
            return (
              <div
                key={gf.id}
                onClick={() => onSelect(gf)}
                className={`flex items-center justify-between p-3 border rounded shadow-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-brand-primary/5 border-brand-primary dark:bg-[#17b385]/10 dark:border-[#17b385]'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-primary/30 dark:hover:border-[#17b385]/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-brand-primary/20 text-brand-primary dark:bg-[#17b385]/20 dark:text-[#17b385]'
                      : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400'
                  }`}>
                    <Flag size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {gf.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {gf.coordinates.length} points
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteGeofence(gf.id)
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                  title="Delete geofence"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── Social Links Footer ────────────────────────────────────────── */}
      <div className="hidden md:block p-3 shrink-0 transition-colors">
        <div className="flex items-center justify-center gap-4">
          <a href="https://github.com/GowthamSankar-dev" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="GitHub">
            <Github size={16} />
          </a>
          <a href="https://www.linkedin.com/in/gowtham-sankar-b141b6351/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="LinkedIn">
            <Linkedin size={16} />
          </a>
          <a href="mailto:gowthamsankarjayaraman@gmail.com" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Email">
            <Mail size={16} />
          </a>
        </div>
      </div>
    </div>
  )
}
