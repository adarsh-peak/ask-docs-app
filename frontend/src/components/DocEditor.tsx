import { useCallback, useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { Button, Spinner } from '@radix-ui/themes'
import { useTheme } from '@adarsh_goswami/design'
import { BlogPost } from './BlogPost'
import { saveDocContent } from '../api/docs'
import './DocEditor.css'

const markdownLang = markdown({ codeLanguages: languages })
const editorTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-content': { padding: '20px 24px' },
  '.cm-gutters': { display: 'none' },
})

interface DocEditorProps {
  path: string
  initialContent: string
  onSaved: (content: string) => void
  onCancel: () => void
}

export function DocEditor({ path, initialContent, onSaved, onCancel }: DocEditorProps) {
  const { theme } = useTheme()
  const [draft, setDraft] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const dirty = draft !== initialContent

  const handleSave = useCallback(async () => {
    if (draftRef.current === initialContent) return
    setSaving(true)
    setError(null)
    try {
      await saveDocContent(path, draftRef.current)
      onSaved(draftRef.current)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }, [path, initialContent, onSaved])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  function handleCancel() {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    onCancel()
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
            'All changes saved'
          )}
        </div>
        <div className="doc-editor-toolbar-actions">
          <Button size="1" variant="soft" color="gray" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="1" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
      <div className="doc-editor-panes">
        <div className="doc-editor-pane doc-editor-pane--source">
          <CodeMirror
            value={draft}
            onChange={setDraft}
            theme={theme === 'dark' ? 'dark' : 'light'}
            extensions={[markdownLang, editorTheme, EditorView.lineWrapping]}
            basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
            autoFocus
          />
        </div>
        <div className="doc-editor-pane doc-editor-pane--preview">
          <BlogPost content={draft} fill />
        </div>
      </div>
    </div>
  )
}
