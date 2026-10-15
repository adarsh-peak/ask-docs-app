import { useCallback, useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { Button, IconButton, Popover, Spinner } from '@radix-ui/themes'
import { useTheme } from '@adarsh_goswami/design'
import { BlogPost } from './BlogPost'
import { saveDocContent } from '../api/docs'
import { getDocumentSaveCoordinator, cleanupDocumentSaveRegistry, closeAfterSave } from './save-coordinator'
import './DocEditor.css'

const markdownLang = markdown({ codeLanguages: languages })
const editorTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-content': { padding: '20px 24px' },
  '.cm-gutters': { display: 'none' },
})

const AUTOSAVE_DELAY_MS = 1000

const SYNTAX_HELP: { syntax: string; result: string }[] = [
  { syntax: '# Heading 1', result: '## / ### for smaller headings' },
  { syntax: '**bold**', result: '*italic*' },
  { syntax: '- item', result: 'bullet list (or `1. item` for numbered)' },
  { syntax: '[label](url)', result: 'link' },
  { syntax: '![alt](url)', result: 'image' },
  { syntax: '[[page-name]]', result: 'wiki-link to another doc' },
  { syntax: '`code`', result: 'inline code' },
  { syntax: '```lang\\ncode\\n```', result: 'code block with syntax highlighting' },
  { syntax: '> quote', result: 'blockquote' },
  { syntax: '---', result: 'horizontal rule' },
  { syntax: '| a | b |', result: 'table row (header separator: `|---|---|`)' },
]

function SyntaxHelp() {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          aria-label="Markdown syntax help"
          title="Markdown syntax help"
          type="button"
        >
          <span style={{ fontSize: 12, fontWeight: 600 }}>?</span>
        </IconButton>
      </Popover.Trigger>
      <Popover.Content size="2" maxWidth="360px">
        <div className="doc-editor-syntax-help">
          <p className="doc-editor-syntax-help-title">Markdown cheatsheet</p>
          <table>
            <tbody>
              {SYNTAX_HELP.map(({ syntax, result }) => (
                <tr key={syntax}>
                  <td><code>{syntax}</code></td>
                  <td>{result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}

interface DocEditorProps {
  path: string
  initialContent: string
  /** Called after each successful autosave, so parents can refresh metadata without leaving edit mode. */
  onSaved: (content: string) => void
  /** Called when the user closes the editor and returns to the preview. */
  onCancel: () => void
}

export function DocEditor(props: DocEditorProps) {
  return <DocumentEditorSession key={props.path} {...props} />
}

function DocumentEditorSession({ path, initialContent, onSaved, onCancel }: DocEditorProps) {
  const { theme } = useTheme()
  const [coordinator] = useState(() => getDocumentSaveCoordinator(
    path, initialContent, content => saveDocContent(path, content),
  ))
  const [draft, setDraft] = useState(() => coordinator.getDraft())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const mountedRef = useRef(false)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirty = coordinator.isDirty()

  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (mountedRef.current) {
      setSaving(true)
      setError(null)
    }
    const result = await coordinator.flush()
    if (mountedRef.current) {
      setSaving(false)
      if (!result.ok) setError(result.error instanceof Error ? result.error.message : String(result.error))
    }
    return result
  }, [coordinator])

  useEffect(() => {
    if (!coordinator.isDirty()) return
    timerRef.current = setTimeout(() => { void flushSave() }, AUTOSAVE_DELAY_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [draft, coordinator, flushSave])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        flushSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flushSave])

  // All triggers, including cleanup, join the same serialized queue.
  useEffect(() => {
    mountedRef.current = true
    setDraft(coordinator.getDraft())
    const unsubscribe = coordinator.subscribe(content => {
      onSavedRef.current(content)
      setSaving(false)
      setError(null)
    })
    const unsubscribeDraft = coordinator.subscribeDraft(setDraft)
    return () => {
      mountedRef.current = false
      unsubscribe()
      unsubscribeDraft()
      if (timerRef.current) clearTimeout(timerRef.current)
      void coordinator.flush().then(cleanupDocumentSaveRegistry)
    }
  }, [coordinator])

  async function handleClose() {
    await closeAfterSave({ flush: flushSave, isDirty: coordinator.isDirty }, () => {
      if (mountedRef.current) onCancel()
    })
  }

  return (
    <div className="doc-editor-shell">
      <div className="doc-editor-toolbar">
        <div className="doc-editor-toolbar-status">
          {saving ? (
            <>
              <Spinner size="1" /> Saving…
            </>
          ) : error ? (
            <span style={{ color: 'var(--error, #d33)' }}>{error}</span>
          ) : dirty ? (
            <>
              <span className="doc-editor-dot" /> Unsaved changes
            </>
          ) : (
            'Saved'
          )}
        </div>
        <div className="doc-editor-toolbar-actions">
          <SyntaxHelp />
          <Button size="1" variant="soft" color="gray" onClick={() => setShowPreview(v => !v)}>
            {showPreview ? 'Hide preview' : 'Show preview'}
          </Button>
          <Button size="1" onClick={handleClose} disabled={saving}>
            Done
          </Button>
        </div>
      </div>
      <div className={`doc-editor-panes ${showPreview ? '' : 'doc-editor-panes--source-only'}`}>
        <div className="doc-editor-pane doc-editor-pane--source">
          <CodeMirror
            value={draft}
            onChange={value => { coordinator.update(value); setDraft(value) }}
            theme={theme === 'dark' ? 'dark' : 'light'}
            extensions={[markdownLang, editorTheme, EditorView.lineWrapping]}
            basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
            autoFocus
          />
        </div>
        {showPreview && (
          <div className="doc-editor-pane doc-editor-pane--preview">
            <BlogPost content={draft} fill />
          </div>
        )}
      </div>
    </div>
  )
}
