// components.jsx — UI primitives for ask-docs
// Loaded as a Babel script; exports components to `window`.

const { useState, useEffect, useRef, useLayoutEffect, useCallback } = React;

// ─────────────────────────────── BRAND BITS ──────────────────────────────────

function AgMark({ size = 28 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#111113" />
      <path d="M14 46 L24 20 L34 46" stroke="#7C6EFA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="18" y1="37" x2="30" y2="37" stroke="#7C6EFA" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M38 28 C38 23 42 20 47 20 C52 20 55 23 55 28 L55 32 L49 32 L49 29" stroke="#F0EEF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 28 C38 33 38 38 38 40 C38 43.5 42 46 47 46 C52 46 55 43.5 55 40 L55 32" stroke="#F0EEF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CosmicBackground({ intensity = 'medium' }) {
  const opacity = intensity === 'subtle' ? 0.55 : intensity === 'cosmic' ? 1.0 : 0.8;
  return (
    <div className="cosmic-bg" style={{ '--orb-opacity': opacity }}>
      <div className="cosmic-orb primary" />
      <div className="cosmic-orb secondary" />
      {intensity !== 'subtle' && <div className="starfield" />}
      <div className="cosmic-vignette" />
    </div>
  );
}

// ─────────────────────────────── ICONS ───────────────────────────────────────

// Default icon size — explicit width/height keep these from filling their
// parent in contexts where no CSS rule scopes them.
const _ic = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Icon = {
  Plus: (p) => (
    <svg {..._ic} {...p}><path d="M12 5v14M5 12h14"/></svg>
  ),
  Send: (p) => (
    <svg {..._ic} strokeWidth="2.2" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
  ),
  Sun: (p) => (
    <svg {..._ic} {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
  ),
  Moon: (p) => (
    <svg {..._ic} {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  ),
  Close: (p) => (
    <svg {..._ic} {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>
  ),
  Refresh: (p) => (
    <svg {..._ic} {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
  ),
  Trash: (p) => (
    <svg {..._ic} {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6"/></svg>
  ),
  Database: (p) => (
    <svg {..._ic} {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6"/></svg>
  ),
  Sparkle: (p) => (
    <svg {..._ic} fill="currentColor" stroke="none" {...p}><path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zm6 10l.9 2.5L21.5 15l-2.6.5L18 18l-.9-2.5L14.5 15l2.6-.5L18 12z"/></svg>
  ),
  Book: (p) => (
    <svg {..._ic} {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>
  ),
  Compass: (p) => (
    <svg {..._ic} {...p}><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>
  ),
  Briefcase: (p) => (
    <svg {..._ic} {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  ),
  Calendar: (p) => (
    <svg {..._ic} {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
  ),
  ChevDown: (p) => (
    <svg {..._ic} width="10" height="10" {...p}><path d="m6 9 6 6 6-6"/></svg>
  ),
  Key: (p) => (
    <svg {..._ic} {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
  ),
  Eye: (p) => (
    <svg {..._ic} {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  EyeOff: (p) => (
    <svg {..._ic} {...p}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
  ),
  Check: (p) => (
    <svg {..._ic} {...p}><path d="M20 6 9 17l-5-5"/></svg>
  ),
  Lock: (p) => (
    <svg {..._ic} {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  External: (p) => (
    <svg {..._ic} {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
  ),
  Edit: (p) => (
    <svg {..._ic} {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  ),
};

// ─────────────────────────── API KEY GATE ──────────────────────────────────

function ApiKeyGate({ onSubmit, error }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [localError, setLocalError] = useState(error || null);
  const inputRef = useRef(null);

  useEffect(() => { setLocalError(error || null); }, [error]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const validate = (v) => {
    if (!v.trim()) return 'Paste your Gemini API key.';
    if (v.trim().length < 20) return "That doesn't look like a valid key — check Google AI Studio.";
    return null;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const v = value.trim();
    const err = validate(v);
    if (err) { setLocalError(err); return; }
    onSubmit(v);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { setValue(text.trim()); setLocalError(null); }
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="gate-stage">
      <div className="gate-card">
        <div className="gate-orb-wrap"><div className="gate-orb" /></div>

        <div className="gate-eyebrow">
          <span className="line" />
          One last thing
          <span className="line" />
        </div>

        <h1 className="gate-title">
          Connect your <span className="accent">Gemini</span> key
        </h1>

        <p className="gate-sub">
          Ask Docs uses Gemini to answer questions over your notes. Your key stays on this device — we never see it.
        </p>

        <form className="gate-form" onSubmit={handleSubmit}>
          <div className="gate-label-row">
            <span>Gemini API key</span>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer noopener">
              Get one from AI Studio <Icon.External />
            </a>
          </div>

          <div className={`gate-input-row ${focused ? 'focused' : ''} ${localError ? 'error' : ''}`}>
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              placeholder="AIzaSy…"
              value={value}
              onChange={(e) => { setValue(e.target.value); if (localError) setLocalError(null); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="gate-paste" onClick={handlePaste} title="Paste">paste</button>
            <button type="button" className="gate-eye" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}>
              {show ? <Icon.EyeOff /> : <Icon.Eye />}
            </button>
          </div>

          {localError && (
            <div className="gate-error">
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--error)' }} />
              {localError}
            </div>
          )}

          <button type="submit" className="gate-submit" disabled={!value.trim()}>
            <Icon.Check />
            Connect & start asking
          </button>
        </form>

        <div className="gate-foot">
          <Icon.Lock />
          <span><strong>Stored locally</strong> · localStorage on this device only</span>
        </div>
      </div>
    </div>
  );
}

// Small chip in the header showing the saved key + edit/forget actions
function KeyChip({ apiKey, onUpdate, onForget }) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (chipRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const last4 = apiKey.slice(-4);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={chipRef}
        className="key-chip"
        onClick={() => setOpen((v) => !v)}
        title="Gemini API key"
      >
        <Icon.Key />
        <span className="mask">····</span>
        <span className="last4">{last4}</span>
      </button>

      {open && (
        <div
          ref={popRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 260,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--brand-radius-lg)',
            boxShadow: 'var(--brand-shadow-lg)',
            padding: 14,
            zIndex: 50,
          }}
        >
          <div style={{
            fontFamily: 'var(--brand-font-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}>
            Gemini API key
          </div>
          <div style={{
            fontFamily: 'var(--brand-font-mono)',
            fontSize: 12,
            color: 'var(--text-primary)',
            padding: '8px 10px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--brand-radius-sm)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Icon.Lock />
            <span style={{ color: 'var(--text-muted)' }}>{apiKey.slice(0, 6)}</span>
            <span style={{ color: 'var(--text-disabled)' }}>·····················</span>
            <span>{last4}</span>
          </div>
          <button
            onClick={() => { setOpen(false); onUpdate(); }}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 32,
              background: 'var(--bg-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--brand-radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: 6,
              fontFamily: 'var(--brand-font-body)',
            }}
          >
            <Icon.Edit />
            Update key
          </button>
          <button
            onClick={() => { setOpen(false); onForget(); }}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 32,
              background: 'transparent',
              color: 'var(--error)',
              border: '1px solid var(--error-border)',
              borderRadius: 'var(--brand-radius-md)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--brand-font-body)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon.Trash />
            Forget key
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────── HEADER ──────────────────────────────────────

function Header({ docCount, lastIndexed, onNewChat, onReindex, onClearIndex, isReindexing, theme, onToggleTheme, apiKey, onUpdateKey, onForgetKey }) {
  const [indexOpen, setIndexOpen] = useState(false);
  const popRef = useRef(null);
  const pillRef = useRef(null);

  useEffect(() => {
    if (!indexOpen) return;
    const onClick = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (pillRef.current?.contains(e.target)) return;
      setIndexOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [indexOpen]);

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="wordmark">
          <AgMark size={26} />
          <span className="title">Ask Docs</span>
        </div>
      </div>

      <div className="header-actions" style={{ position: 'relative' }}>
        <button
          ref={pillRef}
          className="index-pill"
          onClick={() => setIndexOpen((v) => !v)}
          style={{ cursor: 'pointer' }}
          aria-expanded={indexOpen}
        >
          <span className="pulse-dot" />
          <span>{docCount} docs indexed</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {indexOpen && (
          <IndexPopover
            ref={popRef}
            docCount={docCount}
            lastIndexed={lastIndexed}
            isReindexing={isReindexing}
            onReindex={() => { onReindex(); }}
            onClearIndex={() => { onClearIndex(); setIndexOpen(false); }}
          />
        )}

        {apiKey && (
          <KeyChip apiKey={apiKey} onUpdate={onUpdateKey} onForget={onForgetKey} />
        )}

        <button className="theme-toggle-btn" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
        </button>

        <button className="btn-new" onClick={onNewChat}>
          <Icon.Plus />
          New chat
          <span className="kbd">⌘K</span>
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────── INDEX POPOVER ──────────────────────────────────

const IndexPopover = React.forwardRef(function IndexPopover(
  { docCount, lastIndexed, isReindexing, onReindex, onClearIndex },
  ref
) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 320,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--brand-radius-lg)',
        boxShadow: 'var(--brand-shadow-lg)',
        padding: 16,
        zIndex: 50,
        fontFamily: 'var(--brand-font-body)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon.Database />
        <div style={{ fontFamily: 'var(--brand-font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Index
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={metricCardStyle}>
          <div style={metricNumStyle}>{docCount}</div>
          <div style={metricLabelStyle}>documents</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricNumStyle}>{Math.round(docCount * 18)}</div>
          <div style={metricLabelStyle}>chunks</div>
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--brand-font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        letterSpacing: '0.04em',
      }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)' }} />
        last indexed {lastIndexed}
      </div>

      <button
        onClick={onReindex}
        disabled={isReindexing}
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 36,
          background: isReindexing ? 'var(--bg-raised)' : 'var(--accent)',
          color: isReindexing ? 'var(--text-secondary)' : 'var(--accent-contrast)',
          border: 'none',
          borderRadius: 'var(--brand-radius-md)',
          fontFamily: 'var(--brand-font-body)',
          fontSize: 13,
          fontWeight: 500,
          cursor: isReindexing ? 'wait' : 'pointer',
          transition: 'all var(--brand-duration-fast) var(--brand-ease-out)',
        }}
      >
        <span style={{ display: 'inline-flex', animation: isReindexing ? 'spin 1s linear infinite' : 'none', width: 14, height: 14 }}>
          <Icon.Refresh />
        </span>
        {isReindexing ? 'Reindexing…' : 'Reindex now'}
      </button>

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }} />

      <div style={{ fontFamily: 'var(--brand-font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--error)', marginBottom: 8 }}>
        Danger zone
      </div>

      {!confirmingClear ? (
        <button
          onClick={() => setConfirmingClear(true)}
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 32,
            background: 'transparent',
            color: 'var(--error)',
            border: '1px solid var(--error-border)',
            borderRadius: 'var(--brand-radius-md)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--brand-duration-fast) var(--brand-ease-out)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Icon.Trash />
          Clear vector index
        </button>
      ) : (
        <div style={{
          padding: 12,
          border: '1px solid var(--error-border)',
          background: 'var(--error-bg)',
          borderRadius: 'var(--brand-radius-md)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
            This wipes all embeddings. You'll need to reindex from source.
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { onClearIndex(); setConfirmingClear(false); }}
              style={{
                flex: 1, height: 28,
                background: 'var(--error)', color: '#fff',
                border: 'none', borderRadius: 'var(--brand-radius-sm)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Yes, clear
            </button>
            <button
              onClick={() => setConfirmingClear(false)}
              style={{
                flex: 1, height: 28,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-soft)', borderRadius: 'var(--brand-radius-sm)',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

const metricCardStyle = {
  padding: '10px 12px',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--brand-radius-md)',
};
const metricNumStyle = {
  fontFamily: 'var(--brand-font-display)',
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--text-primary)',
  lineHeight: 1,
  marginBottom: 4,
};
const metricLabelStyle = {
  fontFamily: 'var(--brand-font-mono)',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

// ──────────────────────────── EMPTY STATE ───────────────────────────────────

const SUGGESTIONS = [
  { kind: 'recall',   label: 'Recall',   icon: 'Sparkle',   text: 'What did I conclude about pgvector vs Pinecone?' },
  { kind: 'synthesize', label: 'Synthesize', icon: 'Book', text: 'Summarize my reading notes from Q1.' },
  { kind: 'plan',     label: 'Plan',     icon: 'Compass',  text: "What's blocking my 2026 lifting goal?" },
  { kind: 'work',     label: 'Work',     icon: 'Briefcase', text: 'What did I commit to in my last 1:1 with Ankur?' },
];

function EmptyState({ onPick, showSuggestions = true }) {
  return (
    <div className="empty-state">
      <div className="empty-orb-wrap">
        <div className="empty-orb" />
        <div className="empty-orb-ring" />
      </div>

      <div className="empty-eyebrow">
        <span className="line" />
        Your second brain · online
        <span className="line" />
      </div>

      <h1 className="empty-hero">
        Ask anything from <span className="accent">everything</span><br />
        you've ever written.
      </h1>

      <p className="empty-sub">
        Every markdown note you've ever made, queryable in one breath. Answers cite the exact note and chunk they came from.
      </p>

      {showSuggestions && (
        <div className="suggested-grid">
          {SUGGESTIONS.map((s) => {
            const IconComp = Icon[s.icon];
            return (
              <button key={s.text} className="suggest-card" onClick={() => onPick(s.text)}>
                <span className="icon"><IconComp /></span>
                <span>
                  <span className="label">{s.label}</span>
                  <span className="text">{s.text}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── COMPOSER ──────────────────────────────────────

function Composer({ value, onChange, onSubmit, disabled, autoFocus, placeholder, inEmpty }) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  // Auto-resize
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <div className={`composer-wrap ${inEmpty ? 'in-empty' : ''}`}>
      <form
        className={`composer ${focused ? 'focused' : ''}`}
        onSubmit={(e) => { e.preventDefault(); if (canSend) onSubmit(); }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={placeholder || 'Ask your second brain anything…'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!canSend}
          aria-label="Send"
        >
          <Icon.Send />
        </button>
      </form>
    </div>
  );
}

// ──────────────────────────── MESSAGES ──────────────────────────────────────

function UserMessage({ text }) {
  return <div className="msg-user">{text}</div>;
}

// Light markdown renderer for assistant answers — handles **bold**, *italic*,
// `code`, bullet lists, and inline citation pills like [1] [2].
// Returns React nodes.
function renderAssistantText(text, citations, onCiteClick, activeCite) {
  // Split into paragraphs / list groups by blank line
  const paragraphs = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // List
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      paragraphs.push({ kind: 'ul', items });
      continue;
    }
    // Paragraph: collect until blank
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^\s*[-*]\s+/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) paragraphs.push({ kind: 'p', text: buf.join(' ') });
    // skip blank lines
    while (i < lines.length && lines[i].trim() === '') i++;
  }

  return paragraphs.map((p, idx) => {
    if (p.kind === 'ul') {
      return (
        <ul key={idx}>
          {p.items.map((it, j) => (
            <li key={j}>{renderInline(it, citations, onCiteClick, activeCite)}</li>
          ))}
        </ul>
      );
    }
    return <p key={idx}>{renderInline(p.text, citations, onCiteClick, activeCite)}</p>;
  });
}

function renderInline(text, citations, onCiteClick, activeCite) {
  // Tokenize: citations [N], code `x`, bold **x**, italic *x*
  // We do a simple sequential parse.
  const out = [];
  let buf = '';
  let i = 0;
  const flush = () => { if (buf) { out.push(buf); buf = ''; } };

  while (i < text.length) {
    // Citation [N] or [N, M]
    const citeMatch = /^\[(\d+(?:\s*,\s*\d+)*)\]/.exec(text.slice(i));
    if (citeMatch) {
      flush();
      const nums = citeMatch[1].split(',').map((n) => parseInt(n.trim(), 10));
      nums.forEach((n) => {
        const cite = citations.find((c) => c.id === n);
        out.push(
          <CitationPill
            key={`c-${i}-${n}`}
            id={n}
            cite={cite}
            active={activeCite === n}
            onClick={() => cite && onCiteClick(n)}
          />
        );
      });
      i += citeMatch[0].length;
      continue;
    }
    // Code `x`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > -1) {
        flush();
        out.push(<code key={`code-${i}`}>{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    // Bold **x**
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > -1) {
        flush();
        out.push(<strong key={`b-${i}`}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // Italic *x* (not **)
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end > -1 && text[end + 1] !== '*') {
        flush();
        out.push(<em key={`i-${i}`}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return out;
}

function CitationPill({ id, cite, active, onClick }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className={`cite-pill ${active ? 'active' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      role="button"
      tabIndex={0}
    >
      {id}
      {show && cite && (
        <span className="cite-tooltip">
          <span className="title">{cite.title}</span>
          <span style={{ fontFamily: 'var(--brand-font-mono)', fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            {cite.folder}
          </span>
          “{cite.snippet}”
        </span>
      )}
    </span>
  );
}

function AssistantMessage({
  text,
  isStreaming,
  isThinking,
  thinkingLabel,
  citations,
  followups,
  onCiteClick,
  onFollowup,
  activeCite,
}) {
  return (
    <div className="msg-assistant">
      <div className={`assistant-avatar ${isThinking || isStreaming ? 'thinking' : ''}`} />
      <div className="assistant-body">
        {isThinking && (
          <div className="thinking-text">
            <span>{thinkingLabel || 'thinking'}</span>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        {!isThinking && (
          <>
            {renderAssistantText(text, citations, onCiteClick, activeCite)}
            {isStreaming && <span className="caret" />}
          </>
        )}

        {!isStreaming && !isThinking && citations.length > 0 && (
          <div className="answer-foot">
            <div className="sources-strip">
              <span className="label">Sources</span>
              {citations.map((c) => (
                <button key={c.id} className="source-chip" onClick={() => onCiteClick(c.id)}>
                  <span className="num">{c.id}</span>
                  <span className="name">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────── SOURCE PANEL ──────────────────────────────────

function SourcePanel({ doc, citeSnippet, citeNum, onClose }) {
  const contentRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // After render, highlight + scroll to the cited chunk
  useEffect(() => {
    if (!citeSnippet || !contentRef.current) return;
    const root = contentRef.current;
    // Walk text nodes, find first one containing the snippet (first 40 chars)
    const needle = citeSnippet.slice(0, 40).replace(/\s+/g, ' ').trim();
    if (!needle) return;
    let found = null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.tagName === 'PRE' || node.tagName === 'CODE') continue;
      const txt = node.textContent.replace(/\s+/g, ' ');
      if (txt && txt.includes(needle)) {
        found = node;
        break;
      }
    }
    if (found) {
      found.classList.add('cited-chunk');
      setTimeout(() => {
        found.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
    }
  }, [doc, citeSnippet]);

  if (!doc) return null;

  return (
    <>
      <div className="source-panel-backdrop" onClick={onClose} />
      <aside className="source-panel" role="dialog" aria-labelledby="src-title">
        <div className="source-panel-header">
          <div className="source-panel-meta">
            <div className="source-panel-eyebrow">
              <span className="source-cite-tag">cited as [{citeNum}]</span>
              <span className="source-folder-tag">{doc.folder}</span>
            </div>
            <h2 id="src-title" className="source-panel-title">{doc.title}</h2>
            <div className="source-panel-updated">updated {doc.updated}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon.Close />
          </button>
        </div>
        <div className="source-panel-content" ref={contentRef}>
          <div className="md" dangerouslySetInnerHTML={{ __html: window.marked.parse(doc.body) }} />
        </div>
      </aside>
    </>
  );
}

// ───────────────────────── Toast (used for clear-index feedback) ────────────

function Toast({ text, kind = 'info', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const color = kind === 'success' ? 'var(--success)' : kind === 'error' ? 'var(--error)' : 'var(--accent)';
  const bg = kind === 'success' ? 'var(--success-bg)' : kind === 'error' ? 'var(--error-bg)' : 'var(--accent-subtle)';
  const border = kind === 'success' ? 'var(--success-border)' : kind === 'error' ? 'var(--error-border)' : 'var(--accent-border)';
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg-overlay)',
      border: `1px solid ${border}`,
      color: 'var(--text-primary)',
      padding: '10px 16px',
      borderRadius: 'var(--brand-radius-full)',
      boxShadow: 'var(--brand-shadow-lg)',
      fontFamily: 'var(--brand-font-body)',
      fontSize: 13,
      zIndex: 100,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      animation: 'toast-in 240ms var(--brand-ease-out)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      {text}
    </div>
  );
}

// ─────────────────────────── Export to window ───────────────────────────────

Object.assign(window, {
  AgMark,
  CosmicBackground,
  Header,
  EmptyState,
  Composer,
  UserMessage,
  AssistantMessage,
  SourcePanel,
  Toast,
  ApiKeyGate,
  KeyChip,
  SUGGESTIONS,
});
