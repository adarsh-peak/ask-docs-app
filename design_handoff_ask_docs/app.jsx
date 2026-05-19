// app.jsx — main App for ask-docs

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "atmosphere": "cosmic",
  "density": "regular",
  "showEmptySuggestions": true
}/*EDITMODE-END*/;

const { useState, useEffect, useRef, useCallback } = React;

// ─────────────────────── Chat engine: Claude call ───────────────────────────

const CORPUS_CONTEXT = window.CORPUS.map((doc) => (
  `=== DOC id=${doc.slug} title="${doc.title}" folder="${doc.folder}" updated=${doc.updated} ===\n${doc.body}\n`
)).join('\n');

const SYSTEM_PROMPT = `You are ask-docs, a retrieval-augmented assistant that answers questions ONLY using the user's personal markdown notes provided below. This is a second-brain query layer — the notes are eclectic (work, life, travel, recipes, reading, habits, projects).

CORPUS:
${CORPUS_CONTEXT}

Rules:
- Answer ONLY from the corpus. If the answer isn't there, say so plainly and suggest what the user might be thinking of.
- Be direct and short. 3-6 sentences max for most questions. Use bullets when listing.
- Cite every claim inline using [N] markers. Numbering starts at 1 for each answer.
- Pick the most relevant 1-4 docs to cite. Don't pad with weak citations.
- Output STRICT JSON in this exact shape, no preamble:
{
  "answer": "string with [1] [2] citation markers inline",
  "citations": [
    {"id": 1, "slug": "doc-slug-from-corpus", "snippet": "the literal sentence/phrase from the doc that supports the claim (40-180 chars, copy verbatim from the doc)"}
  ]
}`;

async function askClaude(history, userMessage) {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const raw = await window.claude.complete({
    system: SYSTEM_PROMPT,
    messages,
  });

  // Strip ```json fences if any
  let txt = String(raw).trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(txt);
  if (fence) txt = fence[1];
  // Find first { ... last }
  const start = txt.indexOf('{');
  const end = txt.lastIndexOf('}');
  if (start >= 0 && end > start) txt = txt.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(txt);
  } catch (e) {
    console.error('Failed to parse Claude response', e, raw);
    return {
      answer: "Something went wrong parsing my own response. Try rephrasing?",
      citations: [],
      followups: [],
    };
  }

  // Enrich citations with full doc data
  parsed.citations = (parsed.citations || []).map((c) => {
    const doc = window.CORPUS.find((d) => d.slug === c.slug);
    return {
      id: c.id,
      slug: c.slug,
      snippet: c.snippet,
      title: doc?.title || c.slug,
      folder: doc?.folder || '',
      doc,
    };
  });
  return parsed;
}

// Fake-stream a string: yield substrings, ~30ms per word.
async function fakeStream(text, onChunk, signal) {
  // Token by token-ish: split into words while preserving spaces and markdown markers
  const parts = text.match(/\[\d+(?:,\s*\d+)*\]|\S+|\s+/g) || [text];
  let acc = '';
  for (const p of parts) {
    if (signal?.aborted) return;
    acc += p;
    onChunk(acc);
    // Citations: brief pause
    const delay = /^\[\d+/.test(p) ? 80 : Math.max(12, Math.min(50, 14 + Math.random() * 36));
    await new Promise((r) => setTimeout(r, delay));
  }
}

// ─────────────────────── Reindex (simulated) ────────────────────────────────

const REINDEX_PHASES = [
  { label: 'scanning vault…',         dur: 600 },
  { label: 'chunking documents…',     dur: 900 },
  { label: 'embedding 198 chunks…',   dur: 1400 },
  { label: 'upserting to pgvector…',  dur: 700 },
  { label: 'rebuilding HNSW index…',  dur: 500 },
];

async function simulateReindex(onPhase, signal) {
  for (const phase of REINDEX_PHASES) {
    if (signal?.aborted) return false;
    onPhase(phase.label);
    await new Promise((r) => setTimeout(r, phase.dur));
  }
  onPhase(null);
  return true;
}

// ─────────────────────── App component ──────────────────────────────────────

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme to <html>
  useEffect(() => {
    if (t.theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  }, [t.theme]);

  // ── API key (localStorage) ────────────────────────────────────────────────
  const KEY_STORAGE = 'ask-docs:gemini-api-key';
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [editingKey, setEditingKey] = useState(false);

  const saveKey = useCallback((k) => {
    try { localStorage.setItem(KEY_STORAGE, k); } catch {}
    setApiKey(k);
    setEditingKey(false);
  }, []);
  const forgetKey = useCallback(() => {
    try { localStorage.removeItem(KEY_STORAGE); } catch {}
    setApiKey('');
    setEditingKey(false);
  }, []);
  const requestEditKey = useCallback(() => setEditingKey(true), []);

  // ── Chat state ─────────────────────────────────────────────────────────────
  // Messages: { role: 'user'|'assistant', content: string, citations, followups, streaming, thinking, thinkingLabel }
  const [messages, setMessages] = useState([]);
  const [composerValue, setComposerValue] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const abortRef = useRef(null);

  // Source panel state
  const [openSource, setOpenSource] = useState(null);  // { doc, snippet, num }

  // Index state
  const [docCount, setDocCount] = useState(window.CORPUS.length);
  const [lastIndexed, setLastIndexed] = useState('2 hours ago');
  const [isReindexing, setIsReindexing] = useState(false);
  const [toast, setToast] = useState(null);

  // Scroll behavior
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitMessage = useCallback(async (rawText) => {
    const text = (rawText ?? composerValue).trim();
    if (!text) return;
    if (isAnswering) return;
    if (docCount === 0) {
      setToast({ text: "The index is empty — reindex before asking.", kind: 'error' });
      return;
    }

    setComposerValue('');
    setIsAnswering(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const userMsg = { role: 'user', content: text };
    const thinkingLabels = ['retrieving relevant chunks…', 'reading 4 notes…', 'drafting answer…'];
    let labelIdx = 0;
    const assistantMsg = {
      role: 'assistant',
      content: '',
      citations: [],
      thinking: true,
      streaming: false,
      thinkingLabel: thinkingLabels[0],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    const assistantIndex = messages.length + 1;

    // Rotate thinking labels while we wait on Claude
    const labelTimer = setInterval(() => {
      labelIdx = Math.min(labelIdx + 1, thinkingLabels.length - 1);
      setMessages((prev) => {
        const out = [...prev];
        if (out[assistantIndex]) {
          out[assistantIndex] = { ...out[assistantIndex], thinkingLabel: thinkingLabels[labelIdx] };
        }
        return out;
      });
    }, 900);

    try {
      const history = messages.slice(); // history before this message
      const result = await askClaude(history, text);
      clearInterval(labelTimer);

      // Switch from thinking to streaming
      setMessages((prev) => {
        const out = [...prev];
        out[assistantIndex] = {
          ...out[assistantIndex],
          thinking: false,
          streaming: true,
          content: '',
          citations: result.citations,
        };
        return out;
      });

      // Fake-stream the answer
      await fakeStream(result.answer, (partial) => {
        setMessages((prev) => {
          const out = [...prev];
          if (out[assistantIndex]) {
            out[assistantIndex] = { ...out[assistantIndex], content: partial };
          }
          return out;
        });
      }, ac.signal);

      // Finish
      setMessages((prev) => {
        const out = [...prev];
        if (out[assistantIndex]) {
          out[assistantIndex] = {
            ...out[assistantIndex],
            content: result.answer,
            streaming: false,
            thinking: false,
          };
        }
        return out;
      });
    } catch (err) {
      clearInterval(labelTimer);
      console.error(err);
      setMessages((prev) => {
        const out = [...prev];
        if (out[assistantIndex]) {
          out[assistantIndex] = {
            ...out[assistantIndex],
            thinking: false,
            streaming: false,
            content: "Couldn't reach the model. Check the console and try again.",
          };
        }
        return out;
      });
    } finally {
      setIsAnswering(false);
      abortRef.current = null;
    }
  }, [composerValue, isAnswering, messages, docCount]);

  // ── Citation click → open source panel ─────────────────────────────────────
  const onCiteClick = useCallback((num) => {
    // Find the latest message with this citation
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant' && m.citations) {
        const c = m.citations.find((x) => x.id === num);
        if (c && c.doc) {
          setOpenSource({ doc: c.doc, snippet: c.snippet, num: c.id });
          return;
        }
      }
    }
  }, [messages]);

  // ── New chat ───────────────────────────────────────────────────────────────
  const newChat = useCallback(() => {
    if (isAnswering && abortRef.current) abortRef.current.abort();
    setMessages([]);
    setComposerValue('');
    setOpenSource(null);
  }, [isAnswering]);

  // Keyboard: ⌘K / Ctrl+K for new chat
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        newChat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newChat]);

  // ── Reindex ───────────────────────────────────────────────────────────────
  const reindexAc = useRef(null);
  const onReindex = useCallback(async () => {
    if (isReindexing) return;
    setIsReindexing(true);
    const ac = new AbortController();
    reindexAc.current = ac;
    setToast({ text: 'Reindex started…', kind: 'info' });
    const ok = await simulateReindex((label) => {
      if (label) setToast({ text: label, kind: 'info' });
    }, ac.signal);
    if (ok) {
      setDocCount(window.CORPUS.length);
      setLastIndexed('just now');
      setToast({ text: `Reindexed ${window.CORPUS.length} documents`, kind: 'success' });
    }
    setIsReindexing(false);
  }, [isReindexing]);

  // ── Clear index ────────────────────────────────────────────────────────────
  const onClearIndex = useCallback(() => {
    setDocCount(0);
    setLastIndexed('never');
    setToast({ text: 'Vector index cleared. Reindex to query again.', kind: 'error' });
  }, []);

  // ── Toggle theme ───────────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    setTweak('theme', t.theme === 'dark' ? 'light' : 'dark');
  }, [t.theme, setTweak]);

  const isEmpty = messages.length === 0;
  const showGate = !apiKey || editingKey;

  // ──────────────────────────── render ───────────────────────────────────────
  return (
    <>
      <CosmicBackground intensity={t.atmosphere} />

      {showGate ? (
        <ApiKeyGate
          onSubmit={(k) => { saveKey(k); setToast({ text: 'Gemini key saved · ready to ask', kind: 'success' }); }}
        />
      ) : (
        <div className="shell">
          <Header
            docCount={docCount}
            lastIndexed={lastIndexed}
            onNewChat={newChat}
            onReindex={onReindex}
            onClearIndex={onClearIndex}
            isReindexing={isReindexing}
            theme={t.theme}
            onToggleTheme={toggleTheme}
            apiKey={apiKey}
            onUpdateKey={requestEditKey}
            onForgetKey={() => { forgetKey(); setToast({ text: 'Gemini key forgotten', kind: 'info' }); }}
          />

          <div className="chat-region">
            <div ref={scrollRef} className="chat-scroll" style={{ width: '100%' }}>
              <div className={`chat-inner density-${t.density} ${isEmpty ? 'is-empty' : ''}`}>
                {isEmpty ? (
                  <>
                    <EmptyState
                      showSuggestions={t.showEmptySuggestions}
                      onPick={(text) => submitMessage(text)}
                    />
                    <Composer
                      value={composerValue}
                      onChange={setComposerValue}
                      onSubmit={() => submitMessage()}
                      disabled={isAnswering || docCount === 0}
                      autoFocus
                      inEmpty
                      placeholder={docCount === 0 ? 'Index is empty — reindex to start asking' : 'Ask your second brain anything…'}
                    />
                  </>
                ) : (
                  <div className="msg-pair">
                    {messages.map((m, idx) => (
                      m.role === 'user' ? (
                        <UserMessage key={idx} text={m.content} />
                      ) : (
                        <AssistantMessage
                          key={idx}
                          text={m.content}
                          isStreaming={m.streaming}
                          isThinking={m.thinking}
                          thinkingLabel={m.thinkingLabel}
                          citations={m.citations || []}
                          onCiteClick={onCiteClick}
                          activeCite={openSource?.num}
                        />
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom-pinned composer only while chatting */}
            {!isEmpty && (
              <Composer
                value={composerValue}
                onChange={setComposerValue}
                onSubmit={() => submitMessage()}
                disabled={isAnswering}
                autoFocus
              />
            )}
          </div>
        </div>
      )}

      {openSource && (
        <SourcePanel
          doc={openSource.doc}
          citeSnippet={openSource.snippet}
          citeNum={openSource.num}
          onClose={() => setOpenSource(null)}
        />
      )}

      {toast && (
        <Toast text={toast.text} kind={toast.kind} onDone={() => setToast(null)} />
      )}

      {!showGate && (
        <TweaksPanel>
          <TweakSection label="Appearance" />
          <TweakRadio
            label="Theme"
            value={t.theme}
            options={['dark', 'light']}
            onChange={(v) => setTweak('theme', v)}
          />
          <TweakSelect
            label="Atmosphere"
            value={t.atmosphere}
            options={['subtle', 'medium', 'cosmic']}
            onChange={(v) => setTweak('atmosphere', v)}
          />
          <TweakRadio
            label="Density"
            value={t.density}
            options={['compact', 'regular']}
            onChange={(v) => setTweak('density', v)}
          />

          <TweakSection label="Behavior" />
          <TweakToggle
            label="Suggested prompts"
            value={t.showEmptySuggestions}
            onChange={(v) => setTweak('showEmptySuggestions', v)}
          />
        </TweaksPanel>
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
