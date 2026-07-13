import { create } from 'zustand'

export type LinkKind = 'workspace' | 'favorite'

interface LinkModalState {
  open: boolean
  editId: string | null
  prefillUrl: string
  kind: LinkKind
}

interface UIStore {
  linkModal: LinkModalState
  categoryModalOpen: boolean
  newsFormOpen: boolean
  newsPanelOpen: boolean
  groupsPanelOpen: boolean

  openAddLink: (kind: LinkKind, prefillUrl?: string) => void
  openEditLink: (kind: LinkKind, id: string) => void
  closeLinkModal: () => void

  openCategoryModal: () => void
  closeCategoryModal: () => void

  openNewsForm: () => void
  closeNewsForm: () => void
  openNewsPanel: () => void
  closeNewsPanel: () => void

  openGroupsPanel: () => void
  closeGroupsPanel: () => void
}

export const useUI = create<UIStore>((set) => ({
  linkModal: { open: false, editId: null, prefillUrl: '', kind: 'favorite' },
  categoryModalOpen: false,
  newsFormOpen: false,
  newsPanelOpen: false,
  groupsPanelOpen: false,

  openAddLink: (kind, prefillUrl = '') =>
    set({ linkModal: { open: true, editId: null, prefillUrl, kind } }),
  openEditLink: (kind, id) =>
    set({ linkModal: { open: true, editId: id, prefillUrl: '', kind } }),
  closeLinkModal: () =>
    set({ linkModal: { open: false, editId: null, prefillUrl: '', kind: 'favorite' } }),

  openCategoryModal: () => set({ categoryModalOpen: true }),
  closeCategoryModal: () => set({ categoryModalOpen: false }),

  openNewsForm: () => set({ newsFormOpen: true }),
  closeNewsForm: () => set({ newsFormOpen: false }),
  openNewsPanel: () => set({ newsPanelOpen: true }),
  closeNewsPanel: () => set({ newsPanelOpen: false }),

  openGroupsPanel: () => set({ groupsPanelOpen: true }),
  closeGroupsPanel: () => set({ groupsPanelOpen: false }),
}))
