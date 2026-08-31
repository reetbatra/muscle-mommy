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

**Hevy, imported.** If your sets go into Hevy at the rack, connect it once and
the workouts come across on their own: on every app open, plus a nightly cron
as a backstop. Hevy's `/v1/workouts/events?since=` endpoint reports only what
changed, which is what makes syncing on open cheap enough to do every time.

Matching Hevy's names to this app's library is the interesting part. Hevy says
"Bench Press (Dumbbell)", this app says "Dumbbell Bench Press". Names get
reduced to token sets and compared on the movement words, with hardware and
grip words set aside. Three rules keep it honest: qualifier words have to
agree, so an incline press never folds into a flat bench; a near tie returns
nothing, because a wrong match corrupts progression history invisibly; and an
unmatched lift is created under your own library rather than guessed at, then
surfaced in settings with a picker that moves its sets across when you remap
it.

Which day of your split a workout was is decided by exercise overlap against
each planned day, so an imported session reads "Lower A" rather than "Morning
Workout".

Hevy only issues API keys to Pro accounts. Without one, log sets in the app
directly and everything else works the same.

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

## Environment

| Variable | Where it is used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | everywhere |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everywhere |
| `SUPABASE_SERVICE_ROLE_KEY` | the Apple Health ingest and Hevy sync routes, which authenticate on their own tokens rather than a session |
| `AI_GATEWAY_API_KEY` | meal photo analysis; supplied by OIDC on Vercel |
| `CRON_SECRET` | the nightly Hevy sync |
| `NEXT_PUBLIC_SITE_URL` | only when the deployed URL is not a Vercel domain |

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
npm test          # domain logic, 104 tests
npm run typecheck
npm run build
```

There is also an integration check that runs against a deployed instance. It
creates a throwaway user, asserts the signup trigger, row level security, the
ingest and sync endpoints and the public routes, then deletes the user again:

```bash
BASE_URL=https://your-deployment node scripts/verify-live.mjs
```

It needs `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in `.env.local`.

## Layout

```
app/
  (app)/          signed-in screens: today, lift, food, progress, settings
  api/
    food/analyze  photo in, meal row out
    health/ingest the Apple Shortcut endpoint
    hevy/sync     POST for the app, GET for the nightly cron
lib/
  domain/         the actual logic, all pure and all tested
    overload.ts   progression engine
    macros.ts     energy balance and macro targets
    cycle.ts      phase from period-start dates
    schedule.ts   which day of the split is next
    templates.ts  starter programs
  hevy/
    client.ts     the Hevy API
    matching.ts   exercise and split-day matching, pure and tested
    import.ts     turns Hevy workouts into sessions
  actions/        server actions
supabase/migrations/
```

Everything in `lib/domain` is pure and covered by tests. Nothing in there
touches the database, which is what makes the progression rules arguable
rather than mysterious.
