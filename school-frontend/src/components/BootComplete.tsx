import { useEffect } from 'react'
import { markBootDone } from '../lib/boot'

/** Снимает HTML-оверлей «Загрузка…» только после первого commit React. */
export default function BootComplete() {
  useEffect(() => {
    markBootDone()
  }, [])
  return null
}
