import { RefreshCw, Search, Trash2, Github, Linkedin, Mail } from 'lucide-react'
import { useState } from 'react'
import VehicleCard from './VehicleCard'
import { FenceIcon } from './icons/FenceIcon'

/**
 * VehicleList — scrollable panel listing tracked vehicles.
 */
export default function VehicleList({ vehicles, locations, selectedVehicle, onSelect, onEdit, onDelete, onClearUnlinked, onRefresh, isLoading, onToggleView }) {
  const [query, setQuery] = useState('')

  const unlinkedCount = vehicles.filter((v) => v.user_id === null).length

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.device_id.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 shrink-0 transition-colors">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Vehicles & Devices
            <span className="ml-1.5 text-xs text-slate-500 font-medium">
              ({vehicles.length})
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleView}
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
              title="Manage Geofences"
            >
              <FenceIcon className="w-3.5 h-3.5" />
            </button>
            {unlinkedCount > 0 && onClearUnlinked && (
              <button
                onClick={onClearUnlinked}
                className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors"
                title={`Clean up ${unlinkedCount} unlinked guest devices`}
              >
                <Trash2 size={14} />
              </button>
            )}
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
            placeholder="Search name or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>
      </div>

      {/* ── Vehicle cards ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500">
            <img src="/globe.svg" alt="Loading..." className="w-8 h-8 mb-2 opacity-70" />
            <p className="text-xs">Loading vehicles…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-500 text-center px-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">No vehicles found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {vehicles.length === 0
                ? 'Scan the QR code to connect your first phone.'
                : 'Try typing a different name.'}
            </p>
          </div>
        ) : (
          filtered.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              location={locations[vehicle.id]}
              isSelected={selectedVehicle?.id === vehicle.id}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
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
