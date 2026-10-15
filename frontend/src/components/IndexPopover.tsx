import { Button, Text } from '@radix-ui/themes'

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
      <dl className="app-settings-counts">
        {[
          { label: 'Docs', value: docCount },
          { label: 'Chunks', value: chunkCount },
        ].map(({ label, value }) => (
          <div className="app-settings-row" key={label}>
            <dt>{label}</dt>
            <dd><Text weight="bold">{value.toLocaleString()}</Text></dd>
          </div>
        ))}
      </dl>
      <Button onClick={onReindex} loading={isReindexing} style={{ width: '100%' }}>
        Reindex docs
      </Button>
      <Button variant="soft" color="red" onClick={onRequestWipe} style={{ width: '100%' }}>
        Wipe &amp; reindex
      </Button>
    </div>
  )
}
