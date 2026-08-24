import { useState } from 'react'
import { MapPin, X } from 'lucide-react'

export default function AddGeofenceModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#17b385') // default brand green
  const [isSubmitting, setIsSubmitting] = useState(false)

  const PREDEFINED_COLORS = [
    { label: 'Green', value: '#17b385' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Purple', value: '#8b5cf6' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Red', value: '#ef4444' }
  ]

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onSave({ name: name.trim(), color })
      setName('')
      setColor('#17b385')
      onClose()
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setName('')
      setColor('#17b385')
      onClose()
    }
  }

  return (
    <div
      id="add-geofence-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target.id === 'add-geofence-backdrop' && handleClose()}
    >
      <div className="relative bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 shadow-xl max-w-sm w-full animate-fade-in transition-colors">
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6 text-slate-900 dark:text-white">
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 dark:bg-[#17b385]/20 text-brand-primary dark:text-[#17b385] flex items-center justify-center shrink-0 transition-colors">
            <MapPin size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold">Save Geofence</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Name your new custom zone.</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-6">
            <label htmlFor="geofenceName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Geofence Name
            </label>
            <input
              id="geofenceName"
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Headquarters"
              disabled={isSubmitting}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:bg-white transition-colors disabled:opacity-50"
            />
          </div>

          <div className="mb-8">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Zone Color
            </label>
            <div className="flex items-center gap-3">
              {PREDEFINED_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                    color === c.value 
                      ? 'border-slate-900 dark:border-white scale-110 shadow-sm' 
                      : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#149972] rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[80px]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
