import { useEffect, useReducer } from 'react'

export function useMinuteTick() {
  const [, tick] = useReducer((value: number) => value + 1, 0)

  useEffect(() => {
    const timer = window.setInterval(tick, 60_000)
    return () => window.clearInterval(timer)
  }, [])
}
