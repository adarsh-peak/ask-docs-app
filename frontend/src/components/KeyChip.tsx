import { Popover, Button, Text, Flex } from '@radix-ui/themes'

interface KeyChipProps {
  apiKey: string
  onUpdate: () => void
  onForget: () => void
}

export function KeyChip({ apiKey, onUpdate, onForget }: KeyChipProps) {
  const masked = '·····' + apiKey.slice(-4)

  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button variant="soft" color="gray" size="2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7 10a3 3 0 100-6 3 3 0 000 6zm7.5-3h-1.6A5.5 5.5 0 007 2a5.5 5.5 0 00-5.4 5H0v2h1.6A5.5 5.5 0 007 14a5.5 5.5 0 005.4-5h1.6V7z"/>
          </svg>
          {masked}
        </Button>
      </Popover.Trigger>
      <Popover.Content size="1" width="260px">
        <Text
          as="div" size="1" color="gray" mb="1"
          style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          Gemini API key
        </Text>
        <Text
          as="div" size="2" mb="3"
          style={{ wordBreak: 'break-all', fontFamily: 'var(--brand-font-mono)' }}
        >
          {apiKey}
        </Text>
        <Flex gap="2">
          <Popover.Close>
            <Button variant="soft" color="gray" onClick={onUpdate} style={{ flex: 1 }}>
              Update
            </Button>
          </Popover.Close>
          <Popover.Close>
            <Button variant="soft" color="red" onClick={onForget} style={{ flex: 1 }}>
              Forget
            </Button>
          </Popover.Close>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  )
}
