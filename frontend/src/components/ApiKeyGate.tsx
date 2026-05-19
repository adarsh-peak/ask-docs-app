import { useState } from 'react'
import { Dialog, TextField, Button, IconButton, Text, Flex } from '@radix-ui/themes'

interface ApiKeyGateProps {
  onSubmit: (key: string) => void
  onClose?: () => void
}

export function ApiKeyGate({ onSubmit, onClose }: ApiKeyGateProps) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')

  const validate = (v: string) => {
    if (!v.trim()) return 'Paste your Gemini API key.'
    if (v.trim().length < 20) return "That doesn't look like a valid key."
    return ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const e2 = validate(value)
    if (e2) { setErr(e2); return }
    onSubmit(value.trim())
  }

  return (
    <Dialog.Root open onOpenChange={o => { if (!o) onClose?.() }}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Enter your Gemini API key</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Ask Docs uses Gemini to answer questions over your notes. Your key is
          stored in this browser and sent with each chat request so the server
          can call Gemini on your behalf.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <TextField.Root
            mt="4"
            size="3"
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => { setValue(e.target.value); setErr('') }}
            placeholder="AIza…"
            color={err ? 'red' : undefined}
            autoFocus
          >
            <TextField.Slot side="right">
              <IconButton
                type="button" size="1" variant="ghost" color="gray"
                onClick={() => setShow(s => !s)}
                aria-label={show ? 'Hide key' : 'Show key'}
              >
                {show ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3C4.5 3 1.5 5.5 1 8c.5 2.5 3.5 5 7 5s6.5-2.5 7-5c-.5-2.5-3.5-5-7-5zm0 8a3 3 0 110-6 3 3 0 010 6z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 2l12 12M8 3C4.5 3 1.5 5.5 1 8c.5 2.5 3.5 5 7 5s6.5-2.5 7-5c-.5-2.5-3.5-5-7-5z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                )}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>

          {err && <Text as="div" size="1" color="red" mt="1">{err}</Text>}

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button type="submit">Continue</Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}
