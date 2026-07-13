import { create } from 'zustand'
import type { Group, UserSummary } from '../types'
import { api } from '../lib/api'

interface GroupsStore {
  groups: Group[]
  users: UserSummary[]
  loaded: boolean
  load: () => Promise<void>
  addGroup: (name: string) => Promise<void>
  removeGroup: (id: string) => Promise<void>
  setUserGroups: (userId: string, groupIds: string[]) => Promise<void>
}

export const useGroups = create<GroupsStore>((set, get) => ({
  groups: [],
  users: [],
  loaded: false,

  load: async () => {
    const [groups, users] = await Promise.all([api.listGroups(), api.listUsers()])
    set({ groups, users, loaded: true })
  },

  addGroup: async (name) => {
    const g = await api.addGroup(name)
    set((s) => ({ groups: [...s.groups, g] }))
  },

  removeGroup: async (id) => {
    const prev = get().groups
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }))
    try {
      await api.removeGroup(id)
      await get().load()
    } catch (e) {
      console.error(e)
      set({ groups: prev })
    }
  },

  setUserGroups: async (userId, groupIds) => {
    await api.setUserGroups(userId, groupIds)
    await get().load()
  },
}))
