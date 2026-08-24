import { useState } from 'react'
import { AlertTriangle, X, Trash2 } from 'lucide-react'

export default function DeleteGeofenceModal({ isOpen, onClose, geofence, onConfirm }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !geofence) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(geofence.id)
      onClose()
    } catch (err) {
      // Error handling is managed by the parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <div
      id="delete-geofence-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target.id === 'delete-geofence-backdrop' && handleClose()}
    >
      <div className="relative bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 shadow-xl max-w-sm w-full animate-fade-in transition-colors">
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4 text-slate-900 dark:text-white">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-500 flex items-center justify-center shrink-0 transition-colors">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold">Delete Geofence</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">
          Are you sure you want to delete the geofence <span className="font-bold text-slate-900 dark:text-white">{geofence.name}</span>?
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
