import { useEffect } from 'react'
import { Loader } from 'reicon-react'
import { useStore } from '../store/useStore'
import { Header } from './Header'
import { SearchBar } from './SearchBar'
import { CategoryFilter } from './CategoryFilter'
import { LinkGrid } from './LinkGrid'
import { Footer } from './Footer'
import { LinkFormModal } from './modals/LinkFormModal'
import { CategoryFormModal } from './modals/CategoryFormModal'
import { SettingsFab } from './SettingsFab'
import { LiquidRail } from './LiquidRail'
import { NewsPanel } from './news/NewsPanel'
import { NewsFormModal } from './news/NewsFormModal'
import { GroupsPanel } from './admin/GroupsPanel'

export function Board() {
  const load = useStore((s) => s.load)
  const loaded = useStore((s) => s.loaded)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-7 px-5 py-8 sm:px-8 sm:py-10">
        <Header />
        <SearchBar />
        <CategoryFilter />
        <main className="flex-1">
          {loaded ? (
            <LinkGrid />
          ) : (
            <div className="flex justify-center py-16">
              <Loader size={24} className="animate-spin text-slate-600" />
            </div>
          )}
        </main>
        <Footer />
      </div>

      <LiquidRail />
      <CategoryFormModal />
      <NewsPanel />
      <NewsFormModal />
      <GroupsPanel />
      <LinkFormModal />
      <SettingsFab />
    </>
  )
}
