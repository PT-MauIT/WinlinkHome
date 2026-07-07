import { Loader } from 'reicon-react'

export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader size={28} className="animate-spin text-slate-500" />
    </div>
  )
}
