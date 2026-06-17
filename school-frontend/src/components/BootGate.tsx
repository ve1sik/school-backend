import { useEffect, type ReactNode } from 'react'
import { markBootDone } from '../lib/boot'

/** Снимает HTML-оверлей только когда реальный экран (не Suspense fallback) смонтирован. */
export default function BootGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    markBootDone()
  }, [])
  return <>{children}</>
}
