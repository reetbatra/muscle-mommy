"use client";

import { THEME } from "./themes";

/**
 * Every string on this screen earns its place or it is gone. The old version
 * explained itself constantly: "Incline and lateral work · 7 exercises",
 * "Add one rep to 2 sets. All sets at 12 unlocks the next weight.",
 * "Whatever is in the pill box". That is a lot of reading to do at a rack.
 */

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
  { label: "Skincare", done: false },
  { label: "Read", done: true },
];

const LIFTS = [
  { name: "Leg Press", cue: "30kg", sets: "11 · 12 · 11", last: "10 · 12 · 10" },
  { name: "Hip Thrust", cue: "50kg", sets: "8 · 8 · 8", last: "15 · 16 · 14 at 45kg", up: true },
];

/** Four-point sparkle. Drawn, not an emoji, so it takes the accent colour. */
function Sparkle({ size = 14, twinkle = false }: { size?: number; twinkle?: boolean }) {
  return (
    <svg
      className="pv-sparkle"
      data-twinkle={twinkle}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0c.9 5.7 5.4 10.2 11.1 11.1C17.4 12 12.9 16.5 12 22.2 11.1 16.5 6.6 12 .9 11.1 6.6 10.2 11.1 5.7 12 0Z" />
    </svg>
  );
}

export function PreviewSwitcher() {
  return (
    <div className="pv pv-grain" style={THEME.vars as React.CSSProperties}>
      <div style={{ margin: "0 auto", maxWidth: 430, padding: "30px 24px 56px" }}>
        <p
          className="pv-hand"
          style={{
            fontSize: 21,
            color: "var(--p-accent)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Muscle Mommy
          <Sparkle size={13} twinkle />
        </p>

        <p className="pv-eyebrow" style={{ marginTop: 26 }}>
          Monday 31 August
        </p>
        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "8px 0 0",
            fontWeight: 400,
          }}
        >
          Good afternoon,
        </h1>
        <p className="pv-hand" style={{ fontSize: 34, margin: "10px 0 0", color: "var(--p-accent)" }}>
          Reet
        </p>

        <Block label="Next up">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ fontSize: 38, letterSpacing: "-0.02em", margin: 0, fontWeight: 400 }}>
              Upper B
            </h2>
            <span className="pv-num" style={{ fontSize: 14, color: "var(--p-faint)" }}>
              7 lifts
            </span>
          </div>
          <button type="button" className="pv-btn" style={{ marginTop: 18 }}>
            Start
          </button>
        </Block>

        <Block label="Food">
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              className="pv-num"
              style={{ fontSize: 54, fontWeight: 600, color: "var(--p-accent)", lineHeight: 1 }}
            >
              980
            </span>
            <span className="pv-num" style={{ color: "var(--p-soft)", fontSize: 16 }}>
              / 1490
            </span>
            <span
              style={{
                marginLeft: "auto",
                color: "var(--p-good)",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              510 under
              <Sparkle size={12} twinkle />
            </span>
          </div>

          <div style={{ marginTop: 22 }}>
            {MACROS.map((macro, i) => (
              <div key={macro.label} style={{ marginTop: i === 0 ? 0 : 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 17 }}>{macro.label}</span>
                  <span className="pv-num" style={{ fontSize: 15, color: "var(--p-soft)" }}>
                    <strong style={{ color: "var(--p-ink)", fontWeight: 600 }}>{macro.value}</strong>
                    {" / "}
                    {macro.target}
                  </span>
                </div>
                <div className="pv-track">
                  <span style={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="Today's lifts">
          {LIFTS.map((lift, i) => (
            <div key={lift.name} style={{ marginTop: i === 0 ? 0 : 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ fontSize: 22, margin: 0, fontWeight: 400 }}>{lift.name}</h3>
                <span
                  className="pv-num"
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: lift.up ? "var(--p-accent)" : "var(--p-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {lift.up ? <Sparkle size={13} twinkle /> : null}
                  {lift.cue}
                </span>
              </div>
              <p className="pv-num" style={{ fontSize: 20, fontWeight: 600, margin: "8px 0 4px" }}>
                {lift.sets}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <p className="pv-num" style={{ fontSize: 13, color: "var(--p-faint)", margin: 0 }}>
                  was {lift.last}
                </p>
                {lift.up ? (
                  <span className="pv-hand" style={{ fontSize: 20, color: "var(--p-accent)" }}>
                    earned it
                  </span>
                ) : null}
              </div>
              {i < LIFTS.length - 1 ? <hr className="pv-rule" style={{ marginTop: 20 }} /> : null}
            </div>
          ))}
        </Block>

        <Block label="Habits" trailing="5 / 8" note="three to go">
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {HABITS.map((habit, i) => (
              <li key={habit.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0" }}>
                  <span className="pv-check" data-done={habit.done}>
                    {habit.done ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                        <path
                          d="M1.5 5.2 3.8 7.5 8.5 2.8"
                          fill="none"
                          stroke="var(--p-bg)"
                          strokeWidth="1.9"
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
                    }}
                  >
                    {habit.label}
                  </span>
                </div>
                {i < HABITS.length - 1 ? <hr className="pv-rule" /> : null}
              </li>
            ))}
          </ul>
        </Block>

        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--p-rule)",
            marginTop: 40,
            paddingTop: 18,
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
      </div>
    </div>
  );
}

function Block({
  label,
  trailing,
  note,
  children,
}: {
  label: string;
  trailing?: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 38 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <p className="pv-eyebrow">{label}</p>
        {note ? (
          <span
            className="pv-hand"
            style={{ marginLeft: "auto", fontSize: 19, color: "var(--p-accent)" }}
          >
            {note}
          </span>
        ) : null}
        {trailing ? (
          <span className="pv-num" style={{ fontSize: 13, color: "var(--p-faint)" }}>
            {trailing}
          </span>
        ) : null}
      </div>
      <hr className="pv-rule" style={{ margin: "8px 0 18px" }} />
      {children}
    </section>
  );
}
