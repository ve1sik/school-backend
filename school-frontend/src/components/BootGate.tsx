import { useEffect, type ReactNode } from 'react'
import { markBootDone } from '../lib/boot'

/** Отключает HTML-таймаут и boot-обработчики ошибок после монтирования экрана. */
export default function BootGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    markBootDone()
  }, [])
  return <>{children}</>
}
