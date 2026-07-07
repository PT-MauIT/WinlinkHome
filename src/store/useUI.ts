import { create } from 'zustand'

interface LinkModalState {
  open: boolean
  editId: string | null
  prefillUrl: string
}

interface UIStore {
  linkModal: LinkModalState
  categoryModalOpen: boolean

  openAddLink: (prefillUrl?: string) => void
  openEditLink: (id: string) => void
  closeLinkModal: () => void

  openCategoryModal: () => void
  closeCategoryModal: () => void
}

export const useUI = create<UIStore>((set) => ({
  linkModal: { open: false, editId: null, prefillUrl: '' },
  categoryModalOpen: false,

  openAddLink: (prefillUrl = '') =>
    set({ linkModal: { open: true, editId: null, prefillUrl } }),
  openEditLink: (id) =>
    set({ linkModal: { open: true, editId: id, prefillUrl: '' } }),
  closeLinkModal: () =>
    set({ linkModal: { open: false, editId: null, prefillUrl: '' } }),

  openCategoryModal: () => set({ categoryModalOpen: true }),
  closeCategoryModal: () => set({ categoryModalOpen: false }),
}))
