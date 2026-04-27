import { useState, useEffect } from 'react'

export function useElapsedTimer(startTimeIso) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTimeIso) return
    const start = new Date(startTimeIso).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTimeIso])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
