import { useEffect, useRef, useState } from 'react'
import { Lottie } from 'lottie-react'
import confettiAnimation from '../assets/confetti.json'

const BURSTS = 3
const BURST_INTERVAL_MS = 2000

interface CelebrationOverlayProps {
  onDone: () => void
}

export function CelebrationOverlay({ onDone }: CelebrationOverlayProps) {
  const [bursts, setBursts] = useState<number[]>([0])
  const finishedRef = useRef(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < BURSTS; i++) {
      timers.push(setTimeout(() => setBursts(b => [...b, i]), i * BURST_INTERVAL_MS))
    }
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleComplete = (id: number) => {
    finishedRef.current += 1
    setBursts(b => b.filter(x => x !== id))
    if (finishedRef.current >= BURSTS) onDone()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {bursts.map(id => (
        <Lottie
          key={id}
          src={confettiAnimation}
          loop={false}
          autoplay
          subscriptions={{ complete: () => handleComplete(id) }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      ))}
    </div>
  )
}
