import { useEffect, useState } from 'react'
import { Button, Callout, Dialog, Flex, Select, Text, TextField } from '@radix-ui/themes'

const ROOT_FOLDER = '__root__'
const NEW_FOLDER = '__new__'

interface NewDocDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderOptions: string[]
  onCreate: (folder: string, filename: string, tags: string[]) => Promise<void>
}

export function NewDocDialog({ open, onOpenChange, folderOptions, onCreate }: NewDocDialogProps) {
  const [folderChoice, setFolderChoice] = useState<string>(ROOT_FOLDER)
  const [customFolder, setCustomFolder] = useState('')
  const [filename, setFilename] = useState('')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFolderChoice(ROOT_FOLDER)
      setCustomFolder('')
      setFilename('')
      setTags('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const folder = folderChoice === NEW_FOLDER ? customFolder.trim() : folderChoice === ROOT_FOLDER ? '' : folderChoice

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = filename.trim()
    if (!name) {
      setError('File name is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
      await onCreate(folder, name, tagList)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>New markdown file</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Choose a folder and a name. A heading and a tag placeholder are added for you.
        </Dialog.Description>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" weight="medium" mb="1">Folder</Text>
              <Select.Root value={folderChoice} onValueChange={setFolderChoice}>
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value={ROOT_FOLDER}>(root)</Select.Item>
                  {folderOptions.map(f => (
                    <Select.Item key={f} value={f}>{f}</Select.Item>
                  ))}
                  <Select.Item value={NEW_FOLDER}>New folder…</Select.Item>
                </Select.Content>
              </Select.Root>
            </label>

            {folderChoice === NEW_FOLDER && (
              <label>
                <Text as="div" size="2" weight="medium" mb="1">New folder path</Text>
                <TextField.Root
                  placeholder="e.g. projects/ask-docs-app"
                  value={customFolder}
                  onChange={e => setCustomFolder(e.target.value)}
                  autoFocus
                />
              </label>
            )}

            <label>
              <Text as="div" size="2" weight="medium" mb="1">File name</Text>
              <TextField.Root
                placeholder="my-note"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                autoFocus={folderChoice !== NEW_FOLDER}
              >
                <TextField.Slot side="right">
                  <Text size="1" color="gray">.md</Text>
                </TextField.Slot>
              </TextField.Root>
            </label>

            <label>
              <Text as="div" size="2" weight="medium" mb="1">Tags (optional)</Text>
              <TextField.Root
                placeholder="comma, separated, tags"
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </label>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            <Flex gap="3" mt="2" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button" disabled={submitting}>Cancel</Button>
              </Dialog.Close>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}
