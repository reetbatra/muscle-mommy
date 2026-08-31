import { Sparkle } from "@/components/ui/sparkle";
import { projectedFatLossKg, type WeeklyBalance } from "@/lib/domain/week";

const STATUS_COPY: Record<WeeklyBalance["status"], { label: string; tone: string }> = {
  empty: { label: "Not started", tone: "var(--ink-faint)" },
  ahead: { label: "Ahead", tone: "var(--good)" },
  "on-track": { label: "On track", tone: "var(--good)" },
  over: { label: "Over pace", tone: "var(--warn)" },
};

/**
 * The week, not the day. A heavy dinner moves the number for tomorrow instead
 * of failing today, which is both kinder and closer to how fat loss works.
 */
export function WeekCard({ balance }: { balance: WeeklyBalance }) {
  const status = STATUS_COPY[balance.status];
  const spent = balance.budget > 0 ? Math.min(balance.consumed / balance.budget, 1) : 0;
  const pace = balance.budget > 0 ? balance.daysElapsed / 7 : 0;
  const good = balance.status === "ahead" || balance.status === "on-track";

  return (
    <section className="card" aria-labelledby="week-heading">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow" id="week-heading">
          This week
        </p>
        <span className="text-[13px] font-semibold" style={{ color: status.tone }}>
          {status.label}
        </span>
      </div>

      <h2 className="font-display mt-2 flex items-center gap-2 text-[28px] leading-tight text-ink">
        {balance.headline}
        {good && balance.loggedDays > 0 ? <Sparkle size={13} twinkle /> : null}
      </h2>
      <p className="mt-1 text-[15px] text-ink-soft">{balance.detail}</p>

      {/* Spend against the week, with a marker for where the week itself is. */}
      <div className="relative mt-4 h-[6px] w-full bg-surface-3">
        <div
          className="h-full"
          style={{
            width: `${spent * 100}%`,
            background: balance.remaining >= 0 ? "var(--accent)" : "var(--bad)",
          }}
        />
        <span
          className="absolute top-[-3px] h-[12px] w-px bg-[var(--ink-faint)]"
          style={{ left: `${pace * 100}%` }}
          aria-hidden
        />
      </div>
      <div className="tnum mt-1.5 flex justify-between text-[12px] text-ink-faint">
        <span>
          {Math.round(balance.consumed)} of {Math.round(balance.budget)}
        </span>
        <span>
          day {balance.daysElapsed} of 7
        </span>
      </div>

      {balance.netDeficit !== null ? (
        <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2 border-t border-line pt-4">
          <div>
            <dt className="eyebrow">Deficit so far</dt>
            <dd className="tnum mt-0.5 text-[17px] font-semibold text-ink">
              {Math.round(balance.netDeficit).toLocaleString()} kcal
            </dd>
          </div>
          <div>
            <dt className="eyebrow">That is about</dt>
            <dd className="tnum mt-0.5 text-[17px] font-semibold text-ink">
              {projectedFatLossKg(balance.netDeficit).toFixed(2)} kg
            </dd>
          </div>
        </dl>
      ) : null}

      {balance.unloggedDays > 0 ? (
        <p className="mt-3 text-[13px] text-ink-faint">
          {balance.unloggedDays} {balance.unloggedDays === 1 ? "day" : "days"} this week had nothing
          logged, so the deficit only counts the {balance.loggedDays} that did.
        </p>
      ) : null}
    </section>
  );
}
