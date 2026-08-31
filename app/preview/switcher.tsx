"use client";

import { useState } from "react";
import { THEMES, type Theme } from "./themes";

const MACROS = [
  { label: "Protein", value: 78, target: 112 },
  { label: "Carbs", value: 96, target: 167 },
  { label: "Fat", value: 31, target: 41 },
  { label: "Fibre", value: 14, target: 30 },
];

const HABITS = [
  { label: "Supplements", done: true },
  { label: "Protein + creatine", done: true },
  { label: "Fibre", done: false },
  { label: "Water", done: true },
  { label: "Brush teeth", done: false },
  { label: "Moisturiser", done: true },
  { label: "Night skincare", done: false },
  { label: "Read 10 pages", done: true },
];

const LIFTS = [
  { name: "Leg Press", headline: "Stay at 30kg", sets: ["30kg × 11", "30kg × 12", "30kg × 11"], last: "10, 12, 10 @ 30kg" },
  { name: "Hip Thrust", headline: "Go up to 50kg", sets: ["50kg × 8", "50kg × 8", "50kg × 8"], last: "15, 16, 14 @ 45kg" },
];

export function PreviewSwitcher() {
  const [active, setActive] = useState<Theme["id"]>("a");
  const theme = THEMES.find((t) => t.id === active)!;

  return (
    <>
      <div className="pv-switch">
        {THEMES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={option.id === active}
            onClick={() => setActive(option.id)}
          >
            {option.name}
          </button>
        ))}
      </div>

      <div
        className={`pv ${theme.paperGrain ? "pv-grain" : ""}`}
        style={theme.vars as React.CSSProperties}
      >
        <div style={{ margin: "0 auto", maxWidth: 430, padding: "28px 22px 60px" }}>
          <p className="pv-eyebrow" style={{ marginBottom: 10 }}>
            {theme.blurb}
          </p>
          <hr className="pv-rule" style={{ marginBottom: 26 }} />

          <Screen theme={theme} />
        </div>
      </div>
    </>
  );
}

function Screen({ theme }: { theme: Theme }) {
  const display = theme.script ? "pv-script" : "";
  const luxe = theme.id === "c";

  return (
    <>
      <p className="pv-eyebrow">Monday 31 August</p>
      <h1
        className={display}
        style={{
          fontSize: luxe ? 44 : theme.script ? 32 : 36,
          lineHeight: 1.1,
          letterSpacing: luxe ? "-0.02em" : "0",
          margin: "6px 0 0",
          fontWeight: 400,
        }}
      >
        Good afternoon, Reet
      </h1>

      <Section theme={theme} label="Next up" first>
        <div
          className={theme.id === "b" ? "pv-card" : undefined}
          style={theme.id === "b" ? { padding: 18 } : undefined}
        >
          <h2
            className={display}
            style={{
              fontSize: luxe ? 40 : 27,
              lineHeight: 1.15,
              margin: 0,
              fontWeight: 400,
              letterSpacing: luxe ? "-0.02em" : "0",
            }}
          >
            Upper B
          </h2>
          <p style={{ color: "var(--p-soft)", margin: "4px 0 16px", fontSize: 16 }}>
            Incline and lateral work · 7 exercises
          </p>
          <button type="button" className="pv-btn">
            See today&rsquo;s targets
          </button>
        </div>
      </Section>

      <Section theme={theme} label="Today’s food">
        <div
          className={theme.id === "b" ? "pv-card" : undefined}
          style={theme.id === "b" ? { padding: 18 } : undefined}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              className="pv-num"
              style={{ fontSize: luxe ? 58 : 44, fontWeight: 600, color: luxe ? "var(--p-accent)" : "var(--p-ink)", lineHeight: 1 }}
            >
              980
            </span>
            <span style={{ color: "var(--p-soft)", fontSize: 17 }}>of 1490 kcal</span>
          </div>
          <p style={{ color: "var(--p-good)", margin: "8px 0 20px", fontSize: 16 }}>
            510 kcal deficit so far
          </p>

          {MACROS.map((macro, i) => (
            <div key={macro.label} style={{ marginTop: i === 0 ? 0 : 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 17 }}>{macro.label}</span>
                <span className="pv-num" style={{ fontSize: 15, color: "var(--p-soft)" }}>
                  <strong style={{ color: "var(--p-ink)", fontWeight: 600 }}>{macro.value}</strong> / {macro.target}g
                </span>
              </div>
              <div className="pv-track">
                <span style={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section theme={theme} label="Today’s targets">
        {LIFTS.map((lift, i) => (
          <div
            key={lift.name}
            className={theme.id === "b" ? "pv-card" : undefined}
            style={
              theme.id === "b"
                ? { padding: 16, marginTop: i === 0 ? 0 : 12 }
                : { marginTop: i === 0 ? 0 : 22 }
            }
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h3 style={{ fontSize: 21, margin: 0, fontWeight: 500 }}>{lift.name}</h3>
              <span style={{ fontSize: 15, color: "var(--p-accent)", whiteSpace: "nowrap" }}>
                {lift.headline}
              </span>
            </div>
            <div style={{ display: "flex", gap: 14, margin: "12px 0 8px" }}>
              {lift.sets.map((set, index) => (
                <span key={index} className="pv-num" style={{ fontSize: 16, fontWeight: 600 }}>
                  {set}
                </span>
              ))}
            </div>
            <p className="pv-num" style={{ fontSize: 14, color: "var(--p-faint)", margin: 0 }}>
              Last time: {lift.last}
            </p>
            {theme.id !== "b" && i < LIFTS.length - 1 ? (
              <hr className="pv-rule" style={{ marginTop: 22 }} />
            ) : null}
          </div>
        ))}
      </Section>

      <Section theme={theme} label="Daily habits">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {HABITS.map((habit, i) => (
            <li key={habit.label}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0" }}>
                <span className="pv-check" data-done={habit.done}>
                  {habit.done ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                      <path
                        d="M1.5 5.2 3.8 7.5 8.5 2.8"
                        fill="none"
                        stroke="var(--p-bg)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    color: habit.done ? "var(--p-faint)" : "var(--p-ink)",
                    textDecoration: habit.done ? "line-through" : "none",
                  }}
                >
                  {habit.label}
                </span>
              </div>
              {i < HABITS.length - 1 ? <hr className="pv-rule" /> : null}
            </li>
          ))}
        </ul>
      </Section>

      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid var(--p-rule)",
          marginTop: 40,
          paddingTop: 16,
        }}
        aria-label="Example tab bar"
      >
        {["Today", "Lift", "Food", "Progress", "You"].map((tab, i) => (
          <span
            key={tab}
            className="pv-eyebrow"
            style={{ color: i === 0 ? "var(--p-accent)" : "var(--p-faint)" }}
          >
            {tab}
          </span>
        ))}
      </nav>
    </>
  );
}

function Section({
  theme,
  label,
  children,
  first,
}: {
  theme: Theme;
  label: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section style={{ marginTop: first ? 34 : 40 }}>
      {theme.script ? (
        <p
          className="pv-script"
          style={{ fontSize: 20, color: "var(--p-accent)", margin: "0 0 12px" }}
        >
          {label}
        </p>
      ) : (
        <>
          <p className="pv-eyebrow">{label}</p>
          <hr className="pv-rule" style={{ margin: "8px 0 16px" }} />
        </>
      )}
      {children}
    </section>
  );
}
