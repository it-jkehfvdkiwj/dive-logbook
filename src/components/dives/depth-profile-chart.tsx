"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanProfile, type ProfileSample } from "@/lib/profile";

const HEIGHT = 230;
const PAD = { top: 14, right: 14, bottom: 28, left: 40 };

function niceStep(range: number, target: number) {
  const raw = range / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** Tiefenprofil wie im Tauchcomputer: Oberfläche oben, Tiefe nach unten. Tippen/Ziehen zeigt Werte. */
export function DepthProfileChart({ samples: rawSamples, source }: { samples: ProfileSample[]; source?: string }) {
  const samples = useMemo(() => cleanProfile(rawSamples), [rawSamples]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stats = useMemo(() => {
    const maxD = Math.max(...samples.map((s) => s.d));
    const maxIdx = samples.findIndex((s) => s.d === maxD);
    const end = samples[samples.length - 1].t;
    const temps = samples.map((s) => s.temp).filter((x): x is number => x != null);
    return { maxD, maxIdx, end, minTemp: temps.length ? Math.min(...temps) : null };
  }, [samples]);

  const geo = useMemo(() => {
    if (!width) return null;
    const w = width - PAD.left - PAD.right;
    const h = HEIGHT - PAD.top - PAD.bottom;
    const yStep = niceStep(stats.maxD, 4);
    const yMax = Math.ceil((stats.maxD * 1.05) / yStep) * yStep || yStep;
    const xStep = Math.max(60, niceStep(stats.end / 60, Math.max(3, Math.floor(w / 70))) * 60);
    const x = (t: number) => PAD.left + (t / (stats.end || 1)) * w;
    const y = (d: number) => PAD.top + (d / yMax) * h;
    const line = samples.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)},${y(s.d).toFixed(1)}`).join("");
    const area = `${line}L${x(stats.end).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
    const yTicks: number[] = [];
    for (let v = 0; v <= yMax + 0.001; v += yStep) yTicks.push(v);
    const xTicks: number[] = [];
    for (let v = 0; v <= stats.end; v += xStep) xTicks.push(v);
    return { x, y, line, area, yTicks, xTicks, w, h };
  }, [width, samples, stats]);

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left - PAD.left) / geo.w) * stats.end;
    // nächster Punkt (Samples sind nach Zeit sortiert → Binärsuche)
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].t < t) lo = mid;
      else hi = mid;
    }
    setHover(Math.abs(samples[lo].t - t) <= Math.abs(samples[hi].t - t) ? lo : hi);
  }

  const h = hover != null ? samples[hover] : null;
  const maxS = samples[stats.maxIdx];

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[20px] font-bold tracking-tight">Dive profile</h2>
        {source && source !== "manual" && <span className="text-[12px] text-muted-foreground">from {source.toUpperCase()}</span>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        {/* Kopfzeile: Werte am Finger bzw. Übersicht */}
        <div className="flex min-h-[52px] items-center gap-5 border-b border-border/60 px-4 py-2.5 tabular-nums">
          <Metric label={h ? "Time" : "Duration"} value={`${fmtTime(h ? h.t : stats.end)} min`} />
          <Metric label={h ? "Depth" : "Max depth"} value={`${(h ? h.d : stats.maxD).toFixed(1)} m`} />
          {(h ? h.temp != null : stats.minTemp != null) && (
            <Metric label={h ? "Temp" : "Min temp"} value={`${(h ? h.temp! : stats.minTemp!).toFixed(1)} °C`} />
          )}
          {h?.p != null && <Metric label="Tank" value={`${h.p} bar`} />}
        </div>

        <div ref={wrapRef} className="relative">
          {geo && (
            <svg
              width={width}
              height={HEIGHT}
              className="block touch-pan-y select-none"
              onPointerMove={onPointer}
              onPointerDown={onPointer}
              onPointerLeave={() => setHover(null)}
              role="img"
              aria-label={`Depth profile: max ${stats.maxD.toFixed(1)} m, ${fmtTime(stats.end)} min`}
            >
              <defs>
                <linearGradient id="depthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Raster */}
              {geo.yTicks.map((v) => (
                <g key={`y${v}`}>
                  <line x1={PAD.left} x2={PAD.left + geo.w} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--border)" strokeWidth={1} />
                  <text x={PAD.left - 8} y={geo.y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                    {v} m
                  </text>
                </g>
              ))}
              {geo.xTicks.map((v) => (
                <text key={`x${v}`} x={geo.x(v)} y={HEIGHT - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                  {Math.round(v / 60)}′
                </text>
              ))}

              <path d={geo.area} fill="url(#depthFill)" />
              <path d={geo.line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

              {/* Maximaltiefe */}
              {!h && (
                <g>
                  <circle cx={geo.x(maxS.t)} cy={geo.y(maxS.d)} r={4.5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
                  <text
                    x={Math.min(geo.x(maxS.t) + 8, PAD.left + geo.w - 44)}
                    y={Math.min(geo.y(maxS.d) + 16, HEIGHT - PAD.bottom - 4)}
                    className="fill-foreground text-[12px] font-semibold"
                  >
                    {maxS.d.toFixed(1)} m
                  </text>
                </g>
              )}

              {/* Fadenkreuz */}
              {h && (
                <g pointerEvents="none">
                  <line x1={geo.x(h.t)} x2={geo.x(h.t)} y1={PAD.top} y2={PAD.top + geo.h} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
                  <circle cx={geo.x(h.t)} cy={geo.y(h.d)} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
                </g>
              )}
            </svg>
          )}
          {!geo && <div style={{ height: HEIGHT }} />}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="text-[16px] font-bold tracking-tight">{value}</div>
    </div>
  );
}
