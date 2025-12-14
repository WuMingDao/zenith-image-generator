import { Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export interface ContextMenuState {
  nodeId: string
  nodeType: 'configNode' | 'imageNode'
  x: number
  y: number
}

interface NodeContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
  onDeleteConfig: (configId: string) => void
  onDeleteImage: (imageId: string) => void
}

export function NodeContextMenu({
  menu,
  onClose,
  onDeleteConfig,
  onDeleteImage,
}: NodeContextMenuProps) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleDelete = () => {
    const message =
      menu.nodeType === 'configNode'
        ? t('flow.deleteConfigConfirm')
        : t('flow.deleteImageConfirm')

    if (confirm(message)) {
      if (menu.nodeType === 'configNode') {
        onDeleteConfig(menu.nodeId)
      } else {
        onDeleteImage(menu.nodeId)
      }
    }
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: menu.x,
        top: menu.y,
      }}
    >
      <button
        type="button"
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700/50 transition-colors"
      >
        <Trash2 size={14} />
        <span>{t('common.delete')}</span>
      </button>
    </div>
  )
}
