import { useEffect, useRef } from 'react'

/** Keeps the scroll container pinned to the bottom while the user stays near it. */
export function useAutoScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T>(null)
  const stickRef = useRef(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const handleScroll = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight
      stickRef.current = distance < 96
    }
    element.addEventListener('scroll', handleScroll, { passive: true })
    return () => element.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (element && stickRef.current) {
      element.scrollTop = element.scrollHeight
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
