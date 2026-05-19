import { useState } from 'react'
import { Popover, Button, AlertDialog, Flex } from '@radix-ui/themes'
import { Link, useLocation } from 'react-router-dom'
import { AgMark, ThemeToggle, useTheme } from '@adarsh_goswami/design'
import { KeyChip } from './KeyChip'
import { IndexPopover } from './IndexPopover'

interface HeaderProps {
  docCount: number
  chunkCount: number
  isReindexing: boolean
  apiKey: string
  onReindex: () => void
  onWipeReindex: () => void
  onUpdateKey: () => void
  onForgetKey: () => void
}

const NAV_ITEMS = [
  { path: '/', label: 'Chat' },
  { path: '/files', label: 'Files' },
  { path: '/graph', label: 'Graph' },
] as const

export function Header({
  docCount, chunkCount, isReindexing, apiKey,
  onReindex, onWipeReindex, onUpdateKey, onForgetKey,
}: HeaderProps) {
  const { theme } = useTheme()
  const { pathname } = useLocation()
  const [indexOpen, setIndexOpen] = useState(false)
  const [wipeOpen, setWipeOpen] = useState(false)
  const isDark = theme === 'dark'
  const hasDocs = docCount > 0

  return (
    <header style={{
      position: 'relative', zIndex: 2,
      flexShrink: 0, height: 52,
      display: 'flex', justifyContent: 'center',
      borderBottom: '1px solid var(--border-subtle)',
      background: isDark
        ? 'linear-gradient(180deg, rgba(10,10,11,0.7), rgba(10,10,11,0.3))'
        : 'linear-gradient(180deg, rgba(250,250,250,0.9), rgba(250,250,250,0.6))',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 'var(--brand-layout-container-max)',
        padding: '0 var(--brand-layout-px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* Left: brand */}
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, textDecoration: 'none',
        }}>
          <AgMark size={24} />
          <span style={{
            fontFamily: 'var(--brand-font-display)', fontWeight: 700, fontSize: 16,
            letterSpacing: '-0.02em', color: 'var(--text-primary)',
          }}>
            Ask Doc<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        </Link>

        {/* Center: nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={
                  'text-sm no-underline transition-colors duration-fast ' +
                  (isActive
                    ? 'text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary')
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: toggle, then controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ThemeToggle aria-label="Toggle color theme" />

          <Popover.Root open={indexOpen} onOpenChange={setIndexOpen}>
            <Popover.Trigger>
              <Button variant="soft" color="gray" size="2">
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: hasDocs ? 'var(--success)' : 'var(--text-muted)',
                  animation: hasDocs ? 'ad-pulse 2s infinite' : 'none',
                }} />
                {docCount} docs
              </Button>
            </Popover.Trigger>
            <Popover.Content size="1" width="260px">
              <IndexPopover
                docCount={docCount}
                chunkCount={chunkCount}
                isReindexing={isReindexing}
                onReindex={onReindex}
                onRequestWipe={() => { setIndexOpen(false); setWipeOpen(true) }}
              />
            </Popover.Content>
          </Popover.Root>

          {apiKey ? (
            <KeyChip apiKey={apiKey} onUpdate={onUpdateKey} onForget={onForgetKey} />
          ) : (
            <Button variant="soft" size="2" onClick={onUpdateKey}>+ Add API key</Button>
          )}
        </div>
      </div>

      {/* Wipe confirmation */}
      <AlertDialog.Root open={wipeOpen} onOpenChange={setWipeOpen}>
        <AlertDialog.Content maxWidth="420px">
          <AlertDialog.Title>Wipe the index?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            This deletes every indexed chunk. You'll need to reindex before you
            can query your docs again.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={onWipeReindex}>Yes, wipe</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </header>
  )
}
