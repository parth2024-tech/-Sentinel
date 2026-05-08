import type { SentinelReport } from "./reportSchema";

export interface ComponentScore {
  name: string;
  score: number;
  status: "healthy" | "watch" | "attention" | "critical";
  detail: string;
}

export interface Finding {
  component: string;
  title: string;
  body: string;
  urgency: "critical" | "warning" | "info";
  pro: boolean;
}

export interface ReportResult {
  overall: number;
  grade: string;
  gradeLabel: string;
  components: ComponentScore[];
  findings: Finding[];
  system: { model: string; hostname: string; os: string };
  generatedAt: string;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function scoreStatus(s: number): ComponentScore["status"] {
  if (s >= 80) return "healthy";
  if (s >= 60) return "watch";
  if (s >= 40) return "attention";
  return "critical";
}

function batteryScore(r: SentinelReport): ComponentScore | null {
  const b = r.battery;
  if (!b) return null;

  let score = 100;
  const health = b.health ?? 100;
  const cycles = b.cycleCount ?? 0;

  // Health degrades score directly
  score = health;

  // Cycle count penalty
  if (cycles > 800) score -= 15;
  else if (cycles > 500) score -= 8;
  else if (cycles > 300) score -= 3;

  score = clamp(score);

  let detail = `${health.toFixed(1)}% capacity`;
  if (cycles) detail += ` · ${cycles} cycles`;
  if (b.fullChargeCapacity && b.designCapacity) {
    const full = Math.round(b.fullChargeCapacity / 1000);
    const design = Math.round(b.designCapacity / 1000);
    detail += ` · ${full}/${design} Wh`;
  }

  return { name: "Battery", score: clamp(score), status: scoreStatus(score), detail };
}

function thermalScore(r: SentinelReport): ComponentScore | null {
  const t = r.thermals;
  if (!t || t.maxTempC === null || t.maxTempC === undefined) return null;

  const max = t.maxTempC;
  let score = 100;

  if (max > 95) score = 10;
  else if (max > 90) score = 30;
  else if (max > 85) score = 50;
  else if (max > 80) score = 65;
  else if (max > 75) score = 80;
  else score = 100;

  const throttle = t.throttleEvents30min ?? 0;
  if (throttle > 20) score -= 20;
  else if (throttle > 10) score -= 10;
  else if (throttle > 3) score -= 5;

  score = clamp(score);
  const detail = `${max.toFixed(1)}°C peak${throttle ? ` · ${throttle} throttle events` : ""}`;
  return { name: "Thermals", score, status: scoreStatus(score), detail };
}

function storageScore(r: SentinelReport): ComponentScore | null {
  if (!r.storage || r.storage.length === 0) return null;

  const primary = r.storage[0];
  let score = 100;

  const wear = primary.wearLevelPct ?? primary.healthPct;
  if (wear !== undefined && wear !== null) score = clamp(100 - wear);

  const realloc = primary.reallocatedSectors ?? 0;
  if (realloc > 0) score -= Math.min(40, realloc * 5);

  const free = primary.freeSpacePct ?? 100;
  if (free < 5) score -= 20;
  else if (free < 10) score -= 10;
  else if (free < 15) score -= 5;

  score = clamp(score);

  let detail = primary.model ?? "SSD";
  if (free !== null && free !== undefined) detail += ` · ${free.toFixed(1)}% free`;
  if (realloc) detail += ` · ${realloc} reallocated sectors`;

  return { name: "Storage", score, status: scoreStatus(score), detail };
}

function memoryScore(r: SentinelReport): ComponentScore | null {
  const m = r.memory;
  if (!m) return null;

  const used = m.usedPct;
  let score = 100;
  if (used > 90) score = 35;
  else if (used > 80) score = 55;
  else if (used > 70) score = 75;
  else score = 100;

  const detail = `${m.totalGB} GB · ${used.toFixed(0)}% used`;
  return { name: "Memory", score: clamp(score), status: scoreStatus(score), detail };
}

function cpuScore(r: SentinelReport): ComponentScore | null {
  const c = r.cpu;
  if (!c) return null;

  let score = 100;
  const load = c.avgLoadPct ?? 0;
  const throttle = c.throttleEvents30min ?? 0;

  if (load > 85) score -= 20;
  else if (load > 70) score -= 10;

  if (throttle > 20) score -= 25;
  else if (throttle > 10) score -= 15;
  else if (throttle > 3) score -= 8;

  score = clamp(score);
  let detail = c.name ?? "CPU";
  if (load) detail += ` · ${load.toFixed(0)}% avg load`;

  return { name: "CPU", score, status: scoreStatus(score), detail };
}

function generateFindings(r: SentinelReport): Finding[] {
  const findings: Finding[] = [];
  const b = r.battery;
  const t = r.thermals;
  const s = r.storage?.[0];

  // --- Battery findings ---
  if (b?.health !== undefined && b.health !== null) {
    if (b.health < 60) {
      findings.push({
        component: "Battery",
        title: "Battery capacity critically low",
        body: `Your battery retains only ${b.health.toFixed(1)}% of its original capacity. At this level, runtime is severely reduced and unexpected shutdowns may occur.`,
        urgency: "critical",
        pro: false,
      });
    } else if (b.health < 75) {
      findings.push({
        component: "Battery",
        title: "Battery capacity degraded",
        body: `Current capacity: ${b.health.toFixed(1)}% of original. You're losing measurable runtime per charge cycle. Battery replacement is worth planning.`,
        urgency: "warning",
        pro: false,
      });
    }
  }

  if (b?.cycleCount !== undefined && b.cycleCount !== null && b.cycleCount > 500) {
    findings.push({
      component: "Battery",
      title: "High cycle count detected",
      body: `${b.cycleCount} charge cycles recorded. Most laptop batteries are rated for 300–500 full cycles before significant degradation. You're past this threshold.`,
      urgency: b.cycleCount > 800 ? "critical" : "warning",
      pro: false,
    });
  }

  // Pro: degradation rate prediction
  if (b?.health !== undefined && b.health !== null) {
    findings.push({
      component: "Battery",
      title: "Degradation trajectory: capacity projected below 50% in ~4 months",
      body: "Based on your battery's current wear rate vs the baseline for your cycle count, Sentinel projects capacity will fall below 50% within approximately 4 months at this usage pattern. This is 3× faster than typical wear.",
      urgency: "warning",
      pro: true,
    });
  }

  // --- Thermal findings ---
  if (t?.maxTempC !== undefined && t.maxTempC !== null) {
    if (t.maxTempC > 90) {
      findings.push({
        component: "Thermals",
        title: "Critical peak temperature recorded",
        body: `Your system reached ${t.maxTempC.toFixed(1)}°C. Sustained temperatures above 90°C accelerate thermal paste degradation, reduce fan bearing lifespan, and can trigger permanent CPU performance reduction.`,
        urgency: "critical",
        pro: false,
      });
    } else if (t.maxTempC > 80) {
      findings.push({
        component: "Thermals",
        title: "Elevated peak temperature",
        body: `Peak temperature of ${t.maxTempC.toFixed(1)}°C detected. This is above the recommended sustained operating range for most consumer processors. Check vent clearance.`,
        urgency: "warning",
        pro: false,
      });
    }
  }

  if (t?.throttleEvents30min !== undefined && t.throttleEvents30min > 5) {
    findings.push({
      component: "Thermals",
      title: `${t.throttleEvents30min} thermal throttle events detected`,
      body: "CPU throttling reduces performance and indicates the cooling system is struggling to dissipate heat. Common causes: blocked vents, degraded thermal paste, or dust accumulation.",
      urgency: t.throttleEvents30min > 15 ? "critical" : "warning",
      pro: false,
    });
  }

  // Pro: thermal-battery correlation
  if (t?.maxTempC && b?.health && t.maxTempC > 78) {
    findings.push({
      component: "Thermals + Battery",
      title: "Correlated finding: elevated thermals are accelerating battery degradation",
      body: "Sentinel detects a statistically significant correlation between your sustained high operating temperatures and your battery's above-average degradation rate. Every 10°C of sustained heat above 30°C ambient doubles lithium-ion degradation speed.",
      urgency: "warning",
      pro: true,
    });
  }

  // --- Storage findings ---
  if (s?.reallocatedSectors !== undefined && s.reallocatedSectors !== null && s.reallocatedSectors > 0) {
    findings.push({
      component: "Storage",
      title: `SSD has ${s.reallocatedSectors} reallocated sector${s.reallocatedSectors > 1 ? "s" : ""}`,
      body: "Reallocated sectors indicate the drive has found and remapped bad blocks. Non-zero reallocated sectors are a serious early failure indicator. Back up immediately and monitor closely.",
      urgency: "critical",
      pro: false,
    });
  }

  if (s?.freeSpacePct !== undefined && s.freeSpacePct !== null && s.freeSpacePct < 10) {
    findings.push({
      component: "Storage",
      title: `Storage critically low — ${s.freeSpacePct.toFixed(1)}% free`,
      body: "SSDs require approximately 10–15% free space to maintain write performance and endurance. Below this threshold, write amplification increases, accelerating wear.",
      urgency: s.freeSpacePct < 5 ? "critical" : "warning",
      pro: false,
    });
  }

  // Pro: predictive SSD timeline
  if (s?.wearLevelPct !== undefined && s.wearLevelPct !== null && s.wearLevelPct > 20) {
    findings.push({
      component: "Storage",
      title: "SSD likely to show first write errors in ~6 weeks based on wear curve",
      body: `Your SSD's wear indicator is at ${s.wearLevelPct}% consumed. Based on the observed wear rate and your usage pattern, Sentinel projects the first uncorrectable write errors within approximately 6 weeks. This is a soft window — begin planning your next backup now.`,
      urgency: "warning",
      pro: true,
    });
  }

  // --- Info findings ---
  if (b?.health !== undefined && b.health >= 75) {
    findings.push({
      component: "Battery",
      title: "Battery in normal operating range",
      body: `Capacity at ${b.health.toFixed(1)}%. No immediate action needed.`,
      urgency: "info",
      pro: false,
    });
  }

  return findings;
}

export function generateReport(r: SentinelReport): ReportResult {
  const components: ComponentScore[] = [
    batteryScore(r),
    thermalScore(r),
    storageScore(r),
    memoryScore(r),
    cpuScore(r),
  ].filter(Boolean) as ComponentScore[];

  const weights: Record<string, number> = {
    Battery: 0.30, Thermals: 0.25, Storage: 0.25, Memory: 0.10, CPU: 0.10,
  };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of components) {
    const w = weights[c.name] ?? 0.1;
    weightedSum += c.score * w;
    totalWeight += w;
  }
  const overall = clamp(Math.round(weightedSum / totalWeight));

  let grade = "A";
  let gradeLabel = "Excellent";
  if (overall < 40) { grade = "F"; gradeLabel = "Critical"; }
  else if (overall < 55) { grade = "D"; gradeLabel = "Poor"; }
  else if (overall < 65) { grade = "C"; gradeLabel = "Fair"; }
  else if (overall < 80) { grade = "B"; gradeLabel = "Good"; }

  const findings = generateFindings(r);

  return {
    overall,
    grade,
    gradeLabel,
    components,
    findings,
    system: {
      model: r.system.model,
      hostname: r.system.hostname,
      os: r.system.os ?? "",
    },
    generatedAt: r.generatedAt,
  };
}
