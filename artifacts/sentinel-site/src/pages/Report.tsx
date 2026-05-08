import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowRight, Shield, AlertTriangle, Info, Lock, Download } from "lucide-react";
import { generateReport, type ReportResult } from "@/lib/reportEngine";
import { SentinelReportSchema } from "@/lib/reportSchema";

const STATUS_STYLES = {
  healthy:   { bar: "bg-green-500",  badge: "text-green-400 border-green-400/20 bg-green-400/5"  },
  watch:     { bar: "bg-cyan-400",   badge: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5"     },
  attention: { bar: "bg-amber-400",  badge: "text-amber-400 border-amber-400/20 bg-amber-400/5"  },
  critical:  { bar: "bg-red-400",    badge: "text-red-400 border-red-400/20 bg-red-400/5"        },
};

const URGENCY_STYLES = {
  critical: { icon: AlertTriangle, border: "border-l-red-400",   badge: "text-red-400 bg-red-400/8 border-red-400/20"   },
  warning:  { icon: AlertTriangle, border: "border-l-amber-400", badge: "text-amber-400 bg-amber-400/8 border-amber-400/20" },
  info:     { icon: Info,          border: "border-l-cyan-400/40", badge: "text-cyan-400 bg-cyan-400/8 border-cyan-400/20" },
};

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#22d3ee" : score >= 60 ? "#f59e0b" : "#f87171";

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-border/30" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

export default function Report() {
  const params = useParams<{ id: string }>();
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id) { setError("No report ID provided."); return; }

    const stored = localStorage.getItem(`sentinel_report_${id}`);
    if (!stored) { setError("Report not found. Reports are stored locally — this link only works on the device that generated it."); return; }

    try {
      const raw = JSON.parse(stored);
      const parsed = SentinelReportSchema.safeParse(raw);
      if (!parsed.success) { setError("Report data is corrupted or outdated."); return; }
      setResult(generateReport(parsed.data));
    } catch {
      setError("Could not load report data.");
    }
  }, [params?.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Report not found</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{error}</p>
          <Link href="/health-test" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-background bg-primary glow-cyan">
            Generate a new report <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground font-mono animate-pulse">Loading report…</div>
      </div>
    );
  }

  const urgencyOrder = { critical: 0, warning: 1, info: 2 } as const;
  const publicFindings = result.findings.filter((f) => !f.pro).sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  const proFindings    = result.findings.filter((f) => f.pro);
  const genDate = new Date(result.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Report header */}
      <div className="border-b border-border/60 bg-card/20 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wide">Sentinel Hardware Report</div>
              <div className="text-sm font-semibold">{result.system.model}</div>
            </div>
          </div>
          <div className="text-xs font-mono text-muted-foreground/50">{genDate}</div>
        </div>
      </div>

      <div className="px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Overall score */}
          <div className="surface-card rounded-2xl p-8">
            <div className="flex items-center gap-8 flex-wrap">
              <div className="relative shrink-0">
                <ScoreRing score={result.overall} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold tabular-nums">{result.overall}</div>
                  <div className="text-xs text-muted-foreground">/100</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold mb-1">{result.grade} — {result.gradeLabel}</div>
                <div className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {result.overall >= 80
                    ? "Your hardware is in good shape. A few items to watch."
                    : result.overall >= 60
                    ? "Some components need attention. Review the findings below."
                    : "Multiple components are degraded. Prioritise the critical findings."}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-red-400/80 bg-red-400/5 border border-red-400/20 px-2 py-0.5 rounded-full font-mono">
                    {publicFindings.filter((f) => f.urgency === "critical").length} critical
                  </span>
                  <span className="text-amber-400/80 bg-amber-400/5 border border-amber-400/20 px-2 py-0.5 rounded-full font-mono">
                    {publicFindings.filter((f) => f.urgency === "warning").length} warnings
                  </span>
                  <span className="text-cyan-400/80 bg-cyan-400/5 border border-cyan-400/20 px-2 py-0.5 rounded-full font-mono">
                    {publicFindings.filter((f) => f.urgency === "info").length} healthy
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Component breakdown */}
          <div className="surface-card rounded-2xl p-7">
            <h2 className="text-sm font-mono text-muted-foreground/60 uppercase tracking-widest mb-5">Component breakdown</h2>
            <div className="space-y-4">
              {result.components.map((c) => {
                const s = STATUS_STYLES[c.status];
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${s.badge} font-mono`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono">{c.detail}</span>
                        <span className="text-sm font-bold font-mono tabular-nums w-8 text-right">{c.score}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${c.score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Public findings */}
          {publicFindings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-mono text-muted-foreground/60 uppercase tracking-widest">Findings</h2>
              {publicFindings.map((f, i) => {
                const style = URGENCY_STYLES[f.urgency];
                const Icon = style.icon;
                return (
                  <div key={i} className={`surface-card rounded-xl p-5 border-l-2 ${style.border}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded border uppercase ${style.badge} shrink-0 mt-0.5`}>{f.urgency}</span>
                      <div>
                        <div className="text-xs font-mono text-muted-foreground/50 mb-0.5">{f.component}</div>
                        <div className="text-sm font-semibold text-foreground">{f.title}</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pro findings (blurred) */}
          {proFindings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-mono text-muted-foreground/60 uppercase tracking-widest">Predictive findings</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent">PRO</span>
              </div>
              {proFindings.map((f, i) => (
                <div key={i} className="surface-card rounded-xl p-5 border border-accent/20 relative overflow-hidden">
                  <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10 flex items-center justify-center rounded-xl">
                    <div className="text-center px-6">
                      <Lock className="w-5 h-5 text-accent mx-auto mb-2" />
                      <div className="text-sm font-semibold text-foreground mb-1">Pro finding</div>
                      <div className="text-xs text-muted-foreground mb-3">Predictive insights are gated to Pro — unlock with early access.</div>
                      <Link href="/waitlist" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-background bg-accent hover:bg-accent/90 transition-all">
                        Get early access <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                  <div className="opacity-20 select-none pointer-events-none" aria-hidden>
                    <div className="text-xs font-mono text-muted-foreground/50 mb-1">{f.component}</div>
                    <div className="text-sm font-semibold mb-2">{f.title}</div>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="surface-card rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-muted-foreground/60 leading-relaxed max-w-sm">
              This report was generated from your device's hardware telemetry. It was never sent to a server. The data lives only in your browser.
            </div>
            <Link
              href="/health-test"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-border/60 text-foreground hover:border-primary/60 hover:text-primary transition-all"
            >
              Run another scan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
