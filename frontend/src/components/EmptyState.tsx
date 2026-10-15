
const SUGGESTIONS = [
  { label: 'Recall', text: 'What does my docs say about ' },
  { label: 'Synthesize', text: 'Summarize everything about ' },
  { label: 'Plan', text: 'Help me plan based on my notes on ' },
  { label: 'Explore', text: 'What are the key ideas in ' },
]

interface EmptyStateProps {
  onPick: (text: string) => void
}

export function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="chat-empty">
      <h1>Pick up a thought.</h1>
      <p>Find a detail, connect ideas, or return to something you saved.</p>
      <div className="chat-suggestions">
        {SUGGESTIONS.map(s => <button className="chat-suggestion" key={s.label} onClick={() => onPick(s.text)}><strong>{s.label}</strong><span>{s.text}…</span></button>)}
      </div>
    </div>
  )
}
