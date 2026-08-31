-- Muscle Mommy: core schema
-- Every user-owned table is protected by row level security keyed on auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles + goals
-- ---------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  avatar_emoji  text not null default 'sparkle',
  timezone      text not null default 'UTC',
  weight_unit   text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table public.goals (
  user_id           uuid primary key references auth.users on delete cascade,
  calorie_target    integer not null default 1600,
  maintenance_kcal  integer not null default 2000,
  protein_g         integer not null default 120,
  carbs_g           integer not null default 150,
  fat_g             integer not null default 55,
  fiber_g           integer not null default 30,
  step_target       integer not null default 8000,
  pages_target      integer not null default 10,
  weight_goal_kg    numeric(5,2),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------

create table public.habits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  key            text not null,
  label          text not null,
  hint           text,
  icon           text not null default 'sparkles',
  category       text not null default 'wellness'
                 check (category in ('fuel', 'wellness', 'mind')),
  target_per_day smallint not null default 1 check (target_per_day between 1 and 12),
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (user_id, key)
);

create table public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  habit_id   uuid not null references public.habits on delete cascade,
  log_date   date not null,
  count      smallint not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date desc);

-- ---------------------------------------------------------------------------
-- training
-- ---------------------------------------------------------------------------

-- user_id null means the row belongs to the shared starter library.
create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  name         text not null,
  muscle_group text not null,
  equipment    text,
  created_at   timestamptz not null default now()
);

create index exercises_owner_idx on public.exercises (user_id);
create unique index exercises_library_name_idx on public.exercises (lower(name)) where user_id is null;

create table public.routine_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  subtitle   text,
  day_index  smallint not null,
  accent     text not null default 'pink',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index routine_days_user_idx on public.routine_days (user_id, day_index);

create table public.routine_exercises (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  routine_day_id uuid not null references public.routine_days on delete cascade,
  exercise_id    uuid not null references public.exercises on delete restrict,
  position       integer not null default 0,
  target_sets    smallint not null default 3 check (target_sets between 1 and 12),
  rep_low        smallint not null default 8,
  rep_high       smallint not null default 12,
  rest_seconds   integer not null default 90,
  notes          text
);

create index routine_exercises_day_idx on public.routine_exercises (routine_day_id, position);

create table public.workout_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  routine_day_id uuid references public.routine_days on delete set null,
  title          text not null default 'Workout',
  session_date   date not null default current_date,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  feel           smallint check (feel between 1 and 5),
  notes          text
);

create index workout_sessions_user_date_idx on public.workout_sessions (user_id, session_date desc);

create table public.workout_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  session_id  uuid not null references public.workout_sessions on delete cascade,
  exercise_id uuid not null references public.exercises on delete restrict,
  set_index   smallint not null,
  weight_kg   numeric(6,2) not null default 0 check (weight_kg >= 0),
  reps        smallint not null default 0 check (reps >= 0),
  rpe         numeric(3,1) check (rpe between 1 and 10),
  is_warmup   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (session_id, exercise_id, set_index)
);

create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id, created_at desc);

-- ---------------------------------------------------------------------------
-- nutrition
-- ---------------------------------------------------------------------------

create table public.meals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  log_date      date not null,
  meal_type     text not null default 'snack'
                check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  title         text not null,
  photo_path    text,
  kcal          integer not null default 0 check (kcal >= 0),
  protein_g     numeric(6,1) not null default 0,
  carbs_g       numeric(6,1) not null default 0,
  fat_g         numeric(6,1) not null default 0,
  fiber_g       numeric(6,1) not null default 0,
  items         jsonb not null default '[]'::jsonb,
  ai_confidence text check (ai_confidence in ('low', 'medium', 'high')),
  ai_note       text,
  source        text not null default 'photo' check (source in ('photo', 'manual', 'quick')),
  logged_at     timestamptz not null default now()
);

create index meals_user_date_idx on public.meals (user_id, log_date desc);

-- ---------------------------------------------------------------------------
-- health + body
-- ---------------------------------------------------------------------------

create table public.health_days (
  user_id          uuid not null references auth.users on delete cascade,
  log_date         date not null,
  steps            integer,
  active_kcal      integer,
  exercise_minutes integer,
  resting_hr       integer,
  sleep_minutes    integer,
  weight_kg        numeric(5,2),
  pages_read       integer,
  source           text not null default 'shortcut',
  updated_at       timestamptz not null default now(),
  primary key (user_id, log_date)
);

create table public.cycle_days (
  user_id   uuid not null references auth.users on delete cascade,
  log_date  date not null,
  flow      text not null default 'none'
            check (flow in ('none', 'spotting', 'light', 'medium', 'heavy')),
  symptoms  text[] not null default '{}',
  primary key (user_id, log_date)
);

create table public.body_comps (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users on delete cascade,
  measured_on        date not null,
  weight_kg          numeric(5,2),
  skeletal_muscle_kg numeric(5,2),
  body_fat_kg        numeric(5,2),
  body_fat_pct       numeric(4,1),
  bmr                integer,
  visceral_fat       numeric(4,1),
  inbody_score       integer,
  notes              text,
  created_at         timestamptz not null default now(),
  unique (user_id, measured_on)
);

-- ---------------------------------------------------------------------------
-- apple shortcuts ingest tokens (sha-256 hashed, shown to the user once)
-- ---------------------------------------------------------------------------

create table public.ingest_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  token_hash   text not null unique,
  token_prefix text not null,
  label        text not null default 'Apple Shortcut',
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create index ingest_tokens_user_idx on public.ingest_tokens (user_id) where revoked_at is null;
