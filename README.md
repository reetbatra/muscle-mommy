# Muscle Mommy

A personal fitness and wellness PWA. Lifts, macros, steps and daily habits in
one place, built around one job the other apps do badly: knowing whether you
actually progressively overloaded this week.

Add it to an iPhone home screen from Safari and it behaves like any other app.

## What it does

**Progressive overload, decided for you.** Log a set and the next session
already knows the answer. The engine reads your last session for that exercise
and prints a per-set target: same weight with one more rep where a set lagged,
or the next weight up once every set cleared the top of your rep range.

The part that needs care is what "the next weight up" means, because that is a
hardware fact rather than arithmetic:

- A pin-loaded stack moves in a fixed increment, configurable per profile and
  overridable per exercise.
- A dumbbell moves to the next pair physically on your rack, which you list in
  settings.
- When the only jump available is close to a doubling, the app refuses to make
  it. 2.5kg to 5kg is not a 2.5kg increase, it is 100%. Instead the rep ceiling
  stretches in threes up to a hard cap, and only then does the weight move.
- Bodyweight and banded work has no weight to add, so reps are the whole
  progression and the ceiling does not apply.

**Food from a photo.** Take a picture of the plate. You get calories, protein,
carbs, fat and fibre broken down per item, with the portion the model assumed
written down so you can correct it.

**Apple Health, without an app in the middle.** Safari cannot read HealthKit,
so an Apple Shortcut automation posts steps, weight, sleep, resting energy and
active energy to `POST /api/health/ingest` each morning with a bearer token.
Resting plus active energy from Health is a measurement, so it replaces the
Mifflin-St Jeor estimate for the deficit calculation whenever it is present.

**The small things.** Supplements, protein, fibre, water, teeth twice,
moisturiser, skincare, ten pages. Tap them off, they keep a streak.

## Stack

Next.js App Router, TypeScript, Tailwind v4, Supabase (Postgres, auth,
storage), the Vercel AI Gateway for photo analysis, Serwist for the service
worker, deployed on Vercel.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

Apply the migrations in `supabase/migrations` in order, either with
`supabase db push` against a linked project or by pasting them into the SQL
editor. They create the schema, row level security, the shared exercise
library, the new-user trigger, and the progression settings.

```bash
npm test          # domain logic
npm run typecheck
npm run build
```

## Layout

```
app/
  (app)/          signed-in screens: today, lift, food, progress, settings
  api/
    food/analyze  photo in, meal row out
    health/ingest the Apple Shortcut endpoint
lib/
  domain/         the actual logic, all pure and all tested
    overload.ts   progression engine
    macros.ts     energy balance and macro targets
    cycle.ts      phase from period-start dates
    schedule.ts   which day of the split is next
    templates.ts  starter programs
  actions/        server actions
supabase/migrations/
```

Everything in `lib/domain` is pure and covered by tests. Nothing in there
touches the database, which is what makes the progression rules arguable
rather than mysterious.
