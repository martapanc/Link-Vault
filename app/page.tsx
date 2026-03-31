"use client";

import { useState, useRef } from "react";
import type { LinkResult } from "@/lib/types";

const PLACEHOLDER = [
  "https://example.com/article",
  "https://another-site.org/page",
  "https://news.ycombinator.com",
].join("\n");

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} style={styles.copyBtn} title="Copy to clipboard">
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function StatusBadge({ status }: { status: LinkResult["status"] }) {
  const map = {
    success: { label: "OK",      color: "var(--green)", bg: "var(--green-dim)" },
    partial: { label: "PARTIAL", color: "var(--amber)", bg: "var(--amber-dim)" },
    error:   { label: "FAIL",    color: "var(--red)",   bg: "var(--red-dim)" },
  };
  const s = map[status];
  return (
    <span style={{ ...styles.badge, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function ResultRow({ result, index }: { result: LinkResult; index: number }) {
  return (
    <div
      className="fade-in"
      style={{ ...styles.resultRow, animationDelay: `${index * 60}ms` }}
    >
      <div style={styles.resultHeader}>
        <span style={styles.resultIndex}>{String(index + 1).padStart(2, "0")}</span>
        <span style={styles.originalUrl} title={result.originalUrl}>
          {result.originalUrl}
        </span>
        <StatusBadge status={result.status} />
      </div>

      <div style={styles.resultDetail}>
        <span style={styles.detailLabel}>ARCHIVE</span>
        {result.archiveUrl ? (
          <span style={styles.detailLink}>
            <a href={result.archiveUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
              {result.archiveUrl}
            </a>
            <CopyButton text={result.archiveUrl} />
          </span>
        ) : (
          <span style={styles.detailError}>{result.archiveError ?? "—"}</span>
        )}
      </div>

      <div style={styles.resultDetail}>
        <span style={styles.detailLabel}>SHORT</span>
        {result.shortUrl ? (
          <span style={styles.detailLink}>
            <a href={result.shortUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
              {result.shortUrl}
            </a>
            <CopyButton text={result.shortUrl} />
          </span>
        ) : (
          <span style={styles.detailError}>{result.shortError ?? "—"}</span>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<LinkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parseUrls = (raw: string) =>
    raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l.startsWith("http"));

  const handleProcess = async () => {
    const urls = parseUrls(input);
    if (urls.length === 0) {
      setError("No valid URLs found. Make sure each URL starts with http:// or https://");
      return;
    }
    if (urls.length > 20) {
      setError("Maximum 20 URLs per batch.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results);
    } catch (err: unknown) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput("");
    setResults([]);
    setError(null);
    textareaRef.current?.focus();
  };

  const urlCount = parseUrls(input).length;

  const exportCsv = () => {
    const rows = [
      ["Original URL", "Archive URL", "Short URL", "Status"],
      ...results.map((r) => [r.originalUrl, r.archiveUrl ?? "", r.shortUrl ?? "", r.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "link-vault-export.csv";
    a.click();
  };

  return (
    <div style={styles.root}>
      <div style={styles.scanlines} aria-hidden />

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>▣</span>
            <span style={styles.logoText}>LINK VAULT</span>
          </div>
          <div style={styles.headerMeta}>
            <span style={styles.metaChip}>archive.org</span>
            <span style={styles.metaDivider}>+</span>
            <span style={styles.metaChip}>is.gd</span>
          </div>
        </div>
        <p style={styles.tagline}>
          Preserve links permanently · Generate short aliases · Export results
        </p>
      </header>

      <main style={styles.main}>
        <section style={styles.inputSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>INPUT</span>
            <span style={styles.sectionHint}>one URL per line · max 20</span>
          </div>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={6}
            spellCheck={false}
          />
          <div style={styles.inputFooter}>
            <span style={styles.urlCount}>
              {urlCount > 0 ? (
                <><span style={{ color: "var(--amber)" }}>{urlCount}</span> URL{urlCount !== 1 ? "s" : ""} detected</>
              ) : (
                "paste URLs above"
              )}
            </span>
            <div style={styles.actions}>
              <button onClick={handleClear} style={styles.btnSecondary} disabled={loading}>
                CLEAR
              </button>
              <button
                onClick={handleProcess}
                style={{ ...styles.btnPrimary, opacity: loading || urlCount === 0 ? 0.5 : 1 }}
                disabled={loading || urlCount === 0}
              >
                {loading ? (
                  <><span style={styles.spinner}>◌</span> ARCHIVING…</>
                ) : (
                  "▶ ARCHIVE + SHORTEN"
                )}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div style={styles.errorBox} className="fade-in">
            <span style={{ color: "var(--red)" }}>✕</span> {error}
          </div>
        )}

        {loading && (
          <div style={styles.loadingBox} className="fade-in">
            <div style={styles.loadingBar}>
              <div style={styles.loadingFill} />
            </div>
            <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>
              Submitting to Wayback Machine and TinyURL — this may take up to 30s per link…
            </span>
          </div>
        )}

        {results.length > 0 && (
          <section style={styles.resultsSection}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionLabel}>RESULTS</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={styles.sectionHint}>
                  {results.filter((r) => r.status === "success").length}/{results.length} complete
                </span>
                <button onClick={exportCsv} style={styles.exportBtn}>
                  ↓ CSV
                </button>
              </div>
            </div>
            <div style={styles.resultsList}>
              {results.map((r, i) => (
                <ResultRow key={r.originalUrl} result={r} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        <span>LINK VAULT · archive.org Save Page Now · is.gd API</span>
      </footer>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  scanlines: {
    position: "fixed",
    inset: 0,
    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
    pointerEvents: "none",
    zIndex: 1000,
  },
  header: {
    borderBottom: "1px solid var(--border)",
    padding: "24px 32px 20px",
    background: "linear-gradient(180deg, #111412 0%, var(--bg) 100%)",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "6px",
  },
  logo: { display: "flex", alignItems: "center", gap: "10px" },
  logoIcon: { fontSize: "22px", color: "var(--amber)" },
  logoText: {
    fontFamily: "var(--display)",
    fontSize: "22px",
    fontWeight: 800,
    color: "var(--text-bright)",
    letterSpacing: "0.12em",
  },
  headerMeta: { display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" },
  metaChip: {
    fontSize: "11px",
    padding: "2px 8px",
    border: "1px solid var(--border-bright)",
    borderRadius: "2px",
    color: "var(--text-dim)",
    letterSpacing: "0.06em",
  },
  metaDivider: { color: "var(--text-dim)", fontSize: "11px" },
  tagline: { color: "var(--text-dim)", fontSize: "12px", letterSpacing: "0.04em" },
  main: {
    flex: 1,
    maxWidth: "900px",
    width: "100%",
    margin: "0 auto",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  sectionLabel: {
    fontFamily: "var(--display)",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.15em",
    color: "var(--amber)",
  },
  sectionHint: { fontSize: "11px", color: "var(--text-dim)" },
  inputSection: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    padding: "20px",
  },
  textarea: {
    width: "100%",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text-bright)",
    fontFamily: "var(--mono)",
    fontSize: "13px",
    lineHeight: 1.7,
    padding: "12px 14px",
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.15s",
  },
  inputFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  urlCount: { fontSize: "12px", color: "var(--text-dim)" },
  actions: { display: "flex", gap: "8px" },
  btnPrimary: {
    background: "var(--amber)",
    color: "#0d0f0e",
    border: "none",
    borderRadius: "3px",
    padding: "8px 18px",
    fontFamily: "var(--mono)",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "opacity 0.15s",
  },
  btnSecondary: {
    background: "transparent",
    color: "var(--text-dim)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "8px 14px",
    fontFamily: "var(--mono)",
    fontSize: "12px",
    letterSpacing: "0.08em",
    cursor: "pointer",
    transition: "border-color 0.15s, color 0.15s",
  },
  spinner: { display: "inline-block", animation: "pulse 1s infinite" },
  errorBox: {
    background: "var(--red-dim)",
    border: "1px solid var(--red)",
    borderRadius: "3px",
    padding: "12px 16px",
    fontSize: "13px",
    color: "var(--text-bright)",
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },
  loadingBox: { display: "flex", flexDirection: "column", gap: "8px", padding: "4px 0" },
  loadingBar: { height: "2px", background: "var(--border)", borderRadius: "1px", overflow: "hidden" },
  loadingFill: {
    height: "100%",
    width: "40%",
    background: "var(--amber)",
    borderRadius: "1px",
    animation: "scan 1.8s ease-in-out infinite",
  },
  resultsSection: { display: "flex", flexDirection: "column", gap: "0" },
  exportBtn: {
    background: "transparent",
    color: "var(--text-dim)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "3px 10px",
    fontFamily: "var(--mono)",
    fontSize: "11px",
    letterSpacing: "0.06em",
    cursor: "pointer",
  },
  resultsList: { border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" },
  resultRow: {
    padding: "14px 18px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    transition: "background 0.1s",
  },
  resultHeader: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  resultIndex: { color: "var(--text-dim)", fontSize: "11px", minWidth: "22px" },
  originalUrl: {
    color: "var(--text-bright)",
    fontSize: "13px",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },
  badge: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: "2px",
    letterSpacing: "0.1em",
    flexShrink: 0,
  },
  resultDetail: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingLeft: "32px",
    flexWrap: "wrap",
  },
  detailLabel: {
    fontSize: "10px",
    color: "var(--text-dim)",
    letterSpacing: "0.1em",
    minWidth: "52px",
    flexShrink: 0,
  },
  detailLink: { display: "flex", alignItems: "center", gap: "6px", flex: 1, overflow: "hidden" },
  link: {
    color: "var(--green)",
    textDecoration: "none",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  detailError: { color: "var(--red)", fontSize: "12px", opacity: 0.8 },
  copyBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-dim)",
    cursor: "pointer",
    fontSize: "14px",
    padding: "0 2px",
    flexShrink: 0,
    lineHeight: 1,
  },
  footer: {
    borderTop: "1px solid var(--border)",
    padding: "14px 32px",
    fontSize: "11px",
    color: "var(--text-dim)",
    letterSpacing: "0.05em",
    textAlign: "center",
  },
};
