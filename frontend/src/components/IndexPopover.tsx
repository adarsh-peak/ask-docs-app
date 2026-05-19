import { Card, Button, Text } from '@radix-ui/themes'

interface IndexPopoverProps {
  docCount: number
  chunkCount: number
  isReindexing: boolean
  onReindex: () => void
  onRequestWipe: () => void
}

export function IndexPopover({
  docCount, chunkCount, isReindexing, onReindex, onRequestWipe,
}: IndexPopoverProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Docs', value: docCount },
          { label: 'Chunks', value: chunkCount },
        ].map(({ label, value }) => (
          <Card key={label} size="1">
            <Text as="div" size="1" color="gray">{label}</Text>
            <Text as="div" size="6" weight="bold">{value}</Text>
          </Card>
        ))}
      </div>
      <Button onClick={onReindex} loading={isReindexing} style={{ width: '100%' }}>
        Reindex new docs
      </Button>
      <Button variant="soft" color="red" onClick={onRequestWipe} style={{ width: '100%' }}>
        Wipe &amp; reindex
      </Button>
    </div>
  )
}
