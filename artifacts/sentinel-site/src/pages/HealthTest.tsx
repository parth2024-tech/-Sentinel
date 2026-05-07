import { useState, useEffect } from "react";
import { Terminal, Copy, Download, CheckCheck, Cpu, Activity } from "lucide-react";

type Brand = "dell" | "lenovo" | "hp";

interface BrandConfig {
  id: Brand;
  label: string;
  color: string;
  accent: string;
  lang: string;
  ext: string;
  filename: string;
  runner: string;
  runnerNote: string;
  scriptFile: string;
  description: string;
  steps: string[];
}

const brands: BrandConfig[] = [
  {
    id: "dell",
    label: "Dell",
    color: "text-cyan-400",
    accent: "border-cyan-400/60 bg-cyan-400/5",
    lang: "powershell",
    ext: "ps1",
    filename: "sentinel-dell-diagnostic.ps1",
    runner: "PowerShell",
    runnerNote: "Run as Administrator",
    scriptFile: "dell.ps1",
    description:
      "Comprehensive Dell hardware diagnostic — battery health, thermal sensors via Dell DCIM, SSD SMART data, memory pressure, and Dell-specific WMI namespaces including Alienware AWCC and Dell Command | Monitor integration.",
    steps: [
      "Open PowerShell as Administrator",
      'Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass',
      "Download and run the script below",
      "Results appear in the console — full report saved to your Desktop",
    ],
  },
  {
    id: "lenovo",
    label: "Lenovo",
    color: "text-violet-400",
    accent: "border-violet-400/60 bg-violet-400/5",
    lang: "powershell",
    ext: "ps1",
    filename: "sentinel-lenovo-diagnostic.ps1",
    runner: "PowerShell",
    runnerNote: "Run as Administrator",
    scriptFile: "lenovo.ps1",
    description:
      "Deep Lenovo system diagnostic — ThinkPad battery cycle counts, Lenovo Vantage service checks, thermal zone monitoring, SSD endurance, network adapter health, and Lenovo-specific WMI classes for hardware telemetry.",
    steps: [
      "Open PowerShell as Administrator",
      'Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass',
      "Download and run the script below",
      "Results appear in the console — full report saved to your Desktop",
    ],
  },
  {
    id: "hp",
    label: "HP",
    color: "text-blue-400",
    accent: "border-blue-400/60 bg-blue-400/5",
    lang: "python",
    ext: "py",
    filename: "sentinel-hp-diagnostic.py",
    runner: "Python 3.8+",
    runnerNote: "Windows only",
    scriptFile: "hp.py",
    description:
      "HP-specific Python diagnostic — HP Support Assistant detection, battery health via BatteryReport, HP OMEN/ENVY thermal management, WMI-based storage SMART queries, correlation engine that cross-references CPU/RAM/GPU/thermal metrics, and a habit-coaching report generator.",
    steps: [
      "Ensure Python 3.8+ is installed (python.org)",
      "Open Command Prompt or PowerShell as Administrator",
      "Download the script below",
      'Run: python sentinel-hp-diagnostic.py',
    ],
  },
];

export default function HealthTest() {
  const [activeBrand, setActiveBrand] = useState<Brand>("dell");
  const [scripts, setScripts] = useState<Record<Brand, string>>({
    dell: "",
    lenovo: "",
    hp: "",
  });
  const [loading, setLoading] = useState<Record<Brand, boolean>>({
    dell: false,
    lenovo: false,
    hp: false,
  });
  const [copied, setCopied] = useState(false);

  const brand = brands.find((b) => b.id === activeBrand)!;
  const scriptContent = scripts[activeBrand];

  useEffect(() => {
    const base = import.meta.env.BASE_URL;

    brands.forEach(({ id, scriptFile }) => {
      if (scripts[id]) return;
      setLoading((prev) => ({ ...prev, [id]: true }));
      fetch(`${base}scripts/${scriptFile}`)
        .then((r) => r.text())
        .then((text) => {
          setScripts((prev) => ({ ...prev, [id]: text }));
        })
        .catch(() => {
          setScripts((prev) => ({
            ...prev,
            [id]: `# Failed to load script. Please download the file directly.`,
          }));
        })
        .finally(() => {
          setLoading((prev) => ({ ...prev, [id]: false }));
        });
    });
  }, []);

  const handleCopy = () => {
    if (!scriptContent) return;
    navigator.clipboard.writeText(scriptContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!scriptContent) return;
    const blob = new Blob([scriptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = brand.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = scriptContent ? scriptContent.split("\n").length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Activity className="w-3.5 h-3.5" />
            Free Diagnostic Scripts
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Laptop Health Test
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Run a comprehensive hardware diagnostic on your Windows laptop right
            now — no software to install. Scripts are open-source and run
            locally on your machine.
          </p>
        </div>
      </section>

      {/* Brand tabs */}
      <section className="px-6 pb-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 p-1 rounded-xl border border-border/60 bg-card/50 w-fit">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBrand(b.id)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeBrand === b.id
                    ? `${b.color} bg-card border border-border shadow-sm`
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Brand description */}
          <div className={`rounded-xl border p-5 ${brand.accent}`}>
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className={`w-4 h-4 ${brand.color}`} />
                  <span className={`text-sm font-semibold ${brand.color}`}>
                    {brand.label} Diagnostic
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    {brand.runner} · {brand.runnerNote}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {brand.description}
                </p>
              </div>
            </div>
          </div>

          {/* How to run */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              How to run
            </h3>
            <ol className="space-y-2">
              {brand.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full border border-primary/40 text-primary text-xs flex items-center justify-center font-mono font-bold">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    {step.includes(":") ? (
                      <>
                        {step.split(":")[0]}:{" "}
                        <code className="text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono">
                          {step.split(":").slice(1).join(":").trim()}
                        </code>
                      </>
                    ) : (
                      step
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Code viewer */}
          <div className="rounded-xl border border-border/60 bg-[#0d1117] overflow-hidden shadow-xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-[#161b22]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {brand.filename}
                </span>
                {!loading[activeBrand] && lineCount > 0 && (
                  <span className="text-xs text-muted-foreground/60 font-mono">
                    {lineCount.toLocaleString()} lines
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!scriptContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!scriptContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .{brand.ext}
                </button>
              </div>
            </div>

            {/* Script content */}
            <div className="relative h-[520px] overflow-auto">
              {loading[activeBrand] ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Loading script…
                </div>
              ) : scriptContent ? (
                <table className="w-full text-xs font-mono border-collapse">
                  <tbody>
                    {scriptContent.split("\n").map((line, i) => (
                      <tr
                        key={i}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="select-none text-right pr-4 pl-4 py-0.5 text-muted-foreground/40 w-12 border-r border-border/20 sticky left-0 bg-[#0d1117]">
                          {i + 1}
                        </td>
                        <td className="pl-4 pr-4 py-0.5 whitespace-pre text-slate-300 leading-5">
                          <ScriptLine
                            line={line}
                            lang={brand.lang as "powershell" | "python"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Script unavailable
                </div>
              )}
            </div>
          </div>

          {/* Privacy note */}
          <p className="text-xs text-muted-foreground/60 text-center leading-relaxed">
            These scripts run entirely on your machine. No data is sent
            anywhere. The output is saved locally to your Desktop as a text
            file. Review the full source code above before running.
          </p>
        </div>
      </section>
    </div>
  );
}

// Minimal syntax highlighting without a library
function ScriptLine({
  line,
  lang,
}: {
  line: string;
  lang: "powershell" | "python";
}) {
  // Comments
  if (lang === "powershell" && line.trimStart().startsWith("#")) {
    return <span className="text-slate-500">{line}</span>;
  }
  if (lang === "python" && line.trimStart().startsWith("#")) {
    return <span className="text-slate-500">{line}</span>;
  }

  // Section headers (all-caps comment lines in PS)
  if (
    lang === "powershell" &&
    line.includes("===") &&
    line.includes("SECTION")
  ) {
    return <span className="text-primary/60">{line}</span>;
  }

  // String literals
  if (line.includes('"') || line.includes("'")) {
    return <HighlightStrings line={line} lang={lang} />;
  }

  // Keywords
  return <HighlightKeywords line={line} lang={lang} />;
}

const PS_KEYWORDS =
  /(function|if|else|elseif|foreach|for|while|return|param|begin|process|end|try|catch|finally|switch|break|continue|Write-Host|Write-Item|Write-Section|Get-WmiObject|Get-CimInstance|Get-WinEvent|Get-NetAdapter|Get-Process|Get-Service|Test-Path|Select-Object|Where-Object|ForEach-Object|Measure-Object|Sort-Object|Format-Table|Out-File|New-Object|Invoke-Command|Set-ExecutionPolicy|powercfg|wmic)/g;

const PY_KEYWORDS =
  /\b(def|class|if|elif|else|for|while|return|import|from|try|except|finally|with|as|in|not|and|or|is|None|True|False|pass|break|continue|raise|yield|lambda|global|nonlocal|del|assert)\b/g;

function HighlightKeywords({
  line,
  lang,
}: {
  line: string;
  lang: "powershell" | "python";
}) {
  const pattern = lang === "powershell" ? PS_KEYWORDS : PY_KEYWORDS;
  // split() with a capture group interleaves [text, match, text, match, ...]
  const parts = line.split(pattern);
  const result: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      result.push(
        <span key={i} className="text-violet-400 font-medium">
          {part}
        </span>
      );
    } else {
      result.push(<span key={i}>{part}</span>);
    }
  });

  return <>{result}</>;
}

function HighlightStrings({
  line,
  lang,
}: {
  line: string;
  lang: "powershell" | "python";
}) {
  const strPattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  const parts = line.split(strPattern);
  return (
    <>
      {parts.map((part, i) => {
        if (
          (part.startsWith('"') && part.endsWith('"')) ||
          (part.startsWith("'") && part.endsWith("'"))
        ) {
          return (
            <span key={i} className="text-green-400/90">
              {part}
            </span>
          );
        }
        return <HighlightKeywords key={i} line={part} lang={lang} />;
      })}
    </>
  );
}
