import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

export default function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-blue-900/40">
      <RefreshCw className="w-4 h-4 shrink-0" />
      <span className="text-sm font-semibold">Versi baru tersedia</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="bg-white text-blue-700 text-xs font-bold px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
      >
        UPDATE
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-blue-200 hover:text-white text-xs px-1"
      >
        ✕
      </button>
    </div>
  )
}
