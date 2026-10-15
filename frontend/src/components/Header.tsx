import { useState } from 'react'
import { Popover, Button, IconButton, Tooltip, AlertDialog, Flex } from '@radix-ui/themes'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '@adarsh_goswami/design'
import { IndexPopover } from './IndexPopover'
import { WorkspaceIcon } from './WorkspaceIcon'

interface HeaderProps {
  docCount: number
  chunkCount: number
  isReindexing: boolean
  apiKey: string
  onReindex: () => void
  onWipeReindex: () => void
  onUpdateKey: () => void
  onForgetKey: () => void
  onTestCelebrate: () => void
}

const NAV_ITEMS = [
  { path: '/files', label: 'Files', icon: 'folder' },
  { path: '/ask', label: 'Chat', icon: 'chat' },
  { path: '/graph', label: 'Graph', icon: 'graph' },
  { path: '/home', label: 'Activity', icon: 'activity' },
] as const

export function Header({
  docCount, chunkCount, isReindexing, apiKey,
  onReindex, onWipeReindex, onUpdateKey, onForgetKey, onTestCelebrate,
}: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [search, setSearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [wipeOpen, setWipeOpen] = useState(false)

  return (
    <header className="app-header">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="app-header-inner">
        <Link to="/home" className="app-wordmark">Ask Docs</Link>
        <form className="header-search" role="search" onSubmit={e => { e.preventDefault(); navigate('/files', { state: { searchQuery: search } }) }}>
          <WorkspaceIcon name="search" />
          <input aria-label="Search documents" placeholder="Search documents and folders…" value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <nav className="app-navigation" aria-label="Main navigation">
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path} className="app-nav-link" aria-current={pathname.startsWith(item.path) ? 'page' : undefined}><WorkspaceIcon name={item.icon} />{item.label}</Link>
          ))}
        </nav>
        {/* Right: toggle, then controls */}
        <div className="app-header-tools">
          <Tooltip content={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><button className="header-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><WorkspaceIcon name={theme === 'dark' ? 'sun' : 'moon'} size={23} /></button></Tooltip>
          <Button className="header-new-document" aria-label="New document" onClick={() => navigate('/files', { state: { newDocument: Date.now() } })}><span>New document</span><WorkspaceIcon name="plus" /></Button>

          <Popover.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
            <Popover.Trigger>
              <IconButton variant="ghost" color="gray" size="2" aria-label="Workspace settings"><WorkspaceIcon name="more" /></IconButton>
            </Popover.Trigger>
            <Popover.Content width="300px" aria-label="Workspace settings">
              <div className="app-settings">
                <p className="app-settings-title">Workspace settings</p>
                <IndexPopover
                  docCount={docCount}
                  chunkCount={chunkCount}
                  isReindexing={isReindexing}
                  onReindex={onReindex}
                  onRequestWipe={() => { setSettingsOpen(false); setWipeOpen(true) }}
                />
                <div className="app-settings-key">
                  <div className="app-settings-row">
                    <span>Gemini API key</span>
                    {apiKey && <span className="app-settings-key-value">{'·····' + apiKey.slice(-4)}</span>}
                  </div>
                  <Flex gap="2">
                    <Button variant="soft" color="gray" size="2" onClick={() => { setSettingsOpen(false); onUpdateKey() }}>
                      {apiKey ? 'Update key' : '+ Add API key'}
                    </Button>
                    {apiKey && <Button variant="soft" color="red" size="2" onClick={() => { setSettingsOpen(false); onForgetKey() }}>Forget key</Button>}
                  </Flex>
                </div>
                <Tooltip content="Preview celebration animation">
                  <IconButton variant="soft" color="gray" size="2" onClick={onTestCelebrate} aria-label="Preview celebration animation">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 13 6 3l4 4L1 13Z" />
                      <path d="M9 1.5 9.7 3l1.5.7-1.5.7L9 6l-.7-1.6L6.8 3.7l1.5-.7L9 1.5Z" fill="currentColor" stroke="none" />
                      <path d="M12.2 5 12.6 6l1 .4-1 .4-.4 1-.4-1-1-.4 1-.4.4-1Z" fill="currentColor" stroke="none" />
                    </svg>
                  </IconButton>
                </Tooltip>

              </div>
            </Popover.Content>
          </Popover.Root>
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
