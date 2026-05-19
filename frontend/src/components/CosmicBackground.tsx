import { useTheme } from '@adarsh_goswami/design'

interface CosmicBackgroundProps {
  intensity?: 'cosmic' | 'subtle'
}

export function CosmicBackground({ intensity = 'cosmic' }: CosmicBackgroundProps) {
  const { theme } = useTheme()
  // The package's light theme is intentionally minimal — no cosmic overlay.
  if (theme === 'light') return null

  const opacity = intensity === 'cosmic' ? 1 : 0.4
  return (
    <div className="cosmic-bg" style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
    }}>
      <div className="cosmic-orb primary" style={{ opacity }} />
      <div className="cosmic-orb secondary" style={{ opacity }} />
      <div className="starfield" style={{
        position: 'absolute', inset: 0,
        backgroundImage: [
          'radial-gradient(0.8px 0.8px at 12% 22%, rgba(255,255,255,0.55), transparent)',
          'radial-gradient(0.6px 0.6px at 28% 64%, rgba(255,255,255,0.35), transparent)',
          'radial-gradient(1px 1px at 47% 18%, rgba(200,190,255,0.45), transparent)',
          'radial-gradient(0.5px 0.5px at 62% 78%, rgba(255,255,255,0.40), transparent)',
          'radial-gradient(0.8px 0.8px at 78% 32%, rgba(255,255,255,0.60), transparent)',
          'radial-gradient(0.6px 0.6px at 88% 70%, rgba(255,255,255,0.30), transparent)',
          'radial-gradient(0.7px 0.7px at 18% 84%, rgba(255,255,255,0.40), transparent)',
          'radial-gradient(0.5px 0.5px at 38% 38%, rgba(155,143,251,0.45), transparent)',
        ].join(', '),
        backgroundSize: '100% 100%', opacity: 0.6,
        maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 85%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 30%, rgba(10,10,11,0.6) 100%)',
      }} />
    </div>
  )
}
