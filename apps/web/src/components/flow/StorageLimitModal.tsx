import { AlertTriangle, Download, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { STORAGE_LIMITS } from '@/lib/imageBlobStore'

interface StorageLimitModalProps {
  isOpen: boolean
  reason: 'count' | 'size' | null
  currentCount: number
  currentSizeMB: number
  onDownloadAll: () => void
  onConfirmCleanup: () => void
  onCancel: () => void
  isDownloading?: boolean
}

export function StorageLimitModal({
  isOpen,
  reason,
  currentCount,
  currentSizeMB,
  onDownloadAll,
  onConfirmCleanup,
  onCancel,
  isDownloading = false,
}: StorageLimitModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <div className="p-2 rounded-full bg-orange-500/20">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">
            {t('storage.limitReached')}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Warning message */}
          <p className="text-zinc-300">
            {reason === 'count'
              ? t('storage.limitReachedCount', { count: STORAGE_LIMITS.MAX_IMAGES })
              : t('storage.limitReachedSize', {
                  size: currentSizeMB.toFixed(1),
                  max: STORAGE_LIMITS.MAX_STORAGE_MB,
                })}
          </p>

          {/* Current status */}
          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <p className="text-sm text-zinc-400">
              {t('storage.currentStatus', {
                count: currentCount,
                size: currentSizeMB.toFixed(1),
              })}
            </p>
          </div>

          {/* Instructions */}
          <p className="text-sm text-zinc-400">
            {t('storage.downloadFirst')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 p-4 border-t border-zinc-800">
          {/* Download All button */}
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? t('flow.downloading') : t('storage.downloadAllFirst')}
          </button>

          {/* Confirm Cleanup button */}
          <button
            type="button"
            onClick={onConfirmCleanup}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('storage.cleanupAndContinue')}
          </button>

          {/* Cancel button */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StorageLimitModal
