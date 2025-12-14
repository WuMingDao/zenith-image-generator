import type { Edge, Node } from '@xyflow/react'
import { type IDBPDatabase, openDB } from 'idb'
import { create } from 'zustand'
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware'
import { clearAllBlobs, deleteBlobs } from '@/lib/imageBlobStore'

// Layout constants
export const LAYOUT = {
  FIRST_CONFIG_X: 100,
  FIRST_CONFIG_Y: 100,
  CONFIG_SPACING: 350,
  IMAGE_OFFSET_Y: 220,
  IMAGE_SPACING_Y: 280,
} as const

export interface ConfigData extends Record<string, unknown> {
  id: string
  prompt: string
  width: number
  height: number
  batchCount: number
  seed: number
  timestamp: number
  isPreview: boolean // true = preview, false = confirmed
}

// Type for setPreviewConfig input - the fields user provides
export interface PreviewConfigInput {
  prompt: string
  width: number
  height: number
  batchCount: number
  seed: number
}

export interface ImageData extends Record<string, unknown> {
  id: string
  configId: string // Parent config node ID
  prompt: string
  width: number
  height: number
  seed: number
  imageUrl?: string
  imageBlobId?: string // Reference to blob in separate IndexedDB store
  duration?: string
  isLoading: boolean
  error?: string
}

// Storage limit state for modal
export interface StorageLimitState {
  needsCleanup: boolean
  reason: 'count' | 'size' | null
  currentCount: number
  currentSizeMB: number
  pendingImageId: string | null
  pendingBlob: Blob | null
}

export interface FlowState {
  // Nodes
  configNodes: Node<ConfigData>[]
  imageNodes: Node<ImageData>[]

  // Preview state (not persisted)
  previewConfig: ConfigData | null

  // Editing state (not persisted)
  editingConfigId: string | null
  isEditingModified: boolean

  // Lightbox state (not persisted)
  lightboxImageId: string | null

  // Storage limit state (not persisted)
  storageLimitState: StorageLimitState | null

  // Counter for unique IDs
  nodeIdCounter: number

  // Hydration status (not persisted)
  _hasHydrated: boolean

  // Actions
  setPreviewConfig: (config: PreviewConfigInput | null) => void
  confirmConfig: () => string | null
  loadConfigForEditing: (configId: string) => ConfigData | null
  clearEditing: () => void
  setEditingModified: (modified: boolean) => void

  updateConfigPosition: (configId: string, x: number, y: number) => void
  updateImageGenerated: (imageId: string, url: string, duration: string, blobId?: string) => void
  updateImageError: (imageId: string, error: string) => void

  setLightboxImage: (imageId: string | null) => void

  // Storage limit actions
  setStorageLimitState: (state: StorageLimitState | null) => void
  clearStorageLimitState: () => void

  deleteConfig: (configId: string) => void
  deleteImage: (imageId: string) => void
  clearAll: () => void

  // Computed
  getAllNodes: () => Node[]
  getAllEdges: () => Edge[]
  getNextConfigPosition: () => { x: number; y: number }
}

// IndexedDB storage for Zustand persist
const DB_NAME = 'zenith-flow-v2-db'
const DB_VERSION = 1
const STORE_NAME = 'flowState'

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })

  return dbInstance
}

const indexedDBStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDB()
      const value = await db.get(STORE_NAME, name)
      return value || null
    } catch (e) {
      console.error('Failed to load from IndexedDB:', e)
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDB()
      await db.put(STORE_NAME, value, name)
    } catch (e) {
      console.error('Failed to save to IndexedDB:', e)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDB()
      await db.delete(STORE_NAME, name)
    } catch (e) {
      console.error('Failed to remove from IndexedDB:', e)
    }
  },
}

export const useFlowStore = create<FlowState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        configNodes: [],
        imageNodes: [],
        previewConfig: null,
        editingConfigId: null,
        isEditingModified: false,
        lightboxImageId: null,
        storageLimitState: null,
        nodeIdCounter: 0,
        _hasHydrated: false,

        setPreviewConfig: (config) => {
          if (!config) {
            set({ previewConfig: null })
            return
          }

          const state = get()

          set({
            previewConfig: {
              prompt: config.prompt,
              width: config.width,
              height: config.height,
              batchCount: config.batchCount,
              seed: config.seed,
              id: `preview-${state.nodeIdCounter + 1}`,
              timestamp: Date.now(),
              isPreview: true,
            },
          })
        },

        confirmConfig: () => {
          const state = get()
          const { previewConfig } = state

          const configToConfirm = previewConfig

          if (!configToConfirm) return null

          const newConfigId = `config-${state.nodeIdCounter + 1}`
          const position = state.getNextConfigPosition()

          // Create config node
          const newConfigNode: Node<ConfigData> = {
            id: newConfigId,
            type: 'configNode',
            position,
            data: {
              ...configToConfirm,
              id: newConfigId,
              isPreview: false,
            },
            draggable: true,
          }

          // Create image nodes
          const newImageNodes: Node<ImageData>[] = []
          for (let i = 0; i < configToConfirm.batchCount; i++) {
            const imageId = `image-${state.nodeIdCounter + 2 + i}`
            newImageNodes.push({
              id: imageId,
              type: 'imageNode',
              position: {
                x: position.x,
                y: position.y + LAYOUT.IMAGE_OFFSET_Y + i * LAYOUT.IMAGE_SPACING_Y,
              },
              data: {
                id: imageId,
                configId: newConfigId,
                prompt: configToConfirm.prompt,
                width: configToConfirm.width,
                height: configToConfirm.height,
                seed: configToConfirm.seed + i,
                isLoading: true,
              },
              draggable: false,
            })
          }

          set({
            configNodes: [...state.configNodes, newConfigNode],
            imageNodes: [...state.imageNodes, ...newImageNodes],
            previewConfig: null,
            editingConfigId: null,
            isEditingModified: false,
            nodeIdCounter: state.nodeIdCounter + 1 + configToConfirm.batchCount,
          })

          return newConfigId
        },

        loadConfigForEditing: (configId) => {
          const state = get()
          const configNode = state.configNodes.find((n) => n.id === configId)

          if (!configNode) return null

          set({
            editingConfigId: configId,
            isEditingModified: false,
            previewConfig: null,
          })

          return configNode.data
        },

        clearEditing: () => {
          set({
            editingConfigId: null,
            isEditingModified: false,
          })
        },

        setEditingModified: (modified) => {
          set({ isEditingModified: modified })
        },

        updateConfigPosition: (configId, x, y) => {
          const state = get()
          const configNode = state.configNodes.find((n) => n.id === configId)
          if (!configNode) return

          const deltaX = x - configNode.position.x
          const deltaY = y - configNode.position.y

          const updatedConfigNodes = state.configNodes.map((n) =>
            n.id === configId ? { ...n, position: { x, y } } : n
          )

          const updatedImageNodes = state.imageNodes.map((n) =>
            n.data.configId === configId
              ? { ...n, position: { x: n.position.x + deltaX, y: n.position.y + deltaY } }
              : n
          )

          set({
            configNodes: updatedConfigNodes,
            imageNodes: updatedImageNodes,
          })
        },

        updateImageGenerated: (imageId, url, duration, blobId) => {
          set((state) => ({
            imageNodes: state.imageNodes.map((n) =>
              n.id === imageId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      imageUrl: url,
                      imageBlobId: blobId,
                      duration,
                      isLoading: false,
                    },
                  }
                : n
            ),
          }))
        },

        updateImageError: (imageId, error) => {
          set((state) => ({
            imageNodes: state.imageNodes.map((n) =>
              n.id === imageId ? { ...n, data: { ...n.data, error, isLoading: false } } : n
            ),
          }))
        },

        setLightboxImage: (imageId) => {
          set({ lightboxImageId: imageId })
        },

        setStorageLimitState: (state) => {
          set({ storageLimitState: state })
        },

        clearStorageLimitState: () => {
          set({ storageLimitState: null })
        },

        deleteConfig: (configId) => {
          const state = get()
          // Get blob IDs to delete
          const blobIds = state.imageNodes
            .filter((n) => n.data.configId === configId && n.data.imageBlobId)
            .map((n) => n.data.imageBlobId as string)

          // Delete blobs asynchronously
          if (blobIds.length > 0) {
            deleteBlobs(blobIds).catch(console.error)
          }

          set({
            configNodes: state.configNodes.filter((n) => n.id !== configId),
            imageNodes: state.imageNodes.filter((n) => n.data.configId !== configId),
          })
        },

        deleteImage: (imageId) => {
          const state = get()
          const imageNode = state.imageNodes.find((n) => n.id === imageId)

          if (!imageNode) return

          // Delete blob if exists
          if (imageNode.data.imageBlobId) {
            deleteBlobs([imageNode.data.imageBlobId]).catch(console.error)
          }

          set({
            imageNodes: state.imageNodes.filter((n) => n.id !== imageId),
          })
        },

        clearAll: () => {
          // Clear all blobs asynchronously
          clearAllBlobs().catch(console.error)

          set({
            configNodes: [],
            imageNodes: [],
            previewConfig: null,
            editingConfigId: null,
            isEditingModified: false,
            lightboxImageId: null,
            nodeIdCounter: 0,
          })
        },

        getAllNodes: () => {
          const state = get()
          const nodes: Node[] = [...state.configNodes, ...state.imageNodes]

          if (state.previewConfig) {
            const position = state.getNextConfigPosition()
            nodes.push({
              id: state.previewConfig.id,
              type: 'configNode',
              position,
              data: state.previewConfig,
              draggable: false,
              className: 'preview-node',
            })
          }

          return nodes
        },

        getAllEdges: () => {
          const state = get()
          const edges: Edge[] = []

          for (const imageNode of state.imageNodes) {
            edges.push({
              id: `edge-${imageNode.data.configId}-${imageNode.id}`,
              source: imageNode.data.configId,
              target: imageNode.id,
              type: 'smoothstep',
              style: { stroke: '#3f3f46', strokeWidth: 1.5 },
            })
          }

          return edges
        },

        getNextConfigPosition: () => {
          const state = get()
          const confirmedCount = state.configNodes.length

          return {
            x: LAYOUT.FIRST_CONFIG_X + confirmedCount * LAYOUT.CONFIG_SPACING,
            y: LAYOUT.FIRST_CONFIG_Y,
          }
        },
      }),
      {
        name: 'zenith-flow-v2-storage',
        storage: createJSONStorage(() => indexedDBStorage),
        // Only persist these fields
        partialize: (state) => ({
          configNodes: state.configNodes,
          imageNodes: state.imageNodes,
          nodeIdCounter: state.nodeIdCounter,
        }),
        onRehydrateStorage: () => () => {
          // Called after hydration completes
          useFlowStore.setState({ _hasHydrated: true })
        },
      }
    )
  )
)
