-- Hevy import.
--
-- Hevy is where the sets actually get tapped in at the rack. This app is the
-- part that decides what those sets should be. Pulling finished workouts
-- across means the progression engine keeps working without anyone logging
-- the same session twice.
--
-- Every table here is service-role only: it holds a third-party API key, and
-- there is no reason for a browser to ever hold that key again after the
-- moment it is pasted in.

create table public.hevy_connections (
  user_id            uuid primary key references auth.users on delete cascade,
  api_key            text not null,
  hevy_username      text,
  auto_sync          boolean not null default true,
  connected_at       timestamptz not null default now(),
  last_synced_at     timestamptz,
  -- The `since` value handed to /v1/workouts/events on the next run.
  last_event_cursor  timestamptz,
  last_error         text,
  workouts_imported  integer not null default 0
);

-- Maps a Hevy workout to the session it produced, so a re-sync updates the
-- same session instead of creating a second copy of the same training day.
create table public.hevy_workout_links (
  user_id          uuid not null references auth.users on delete cascade,
  hevy_workout_id  text not null,
  session_id       uuid not null references public.workout_sessions on delete cascade,
  hevy_updated_at  timestamptz,
  primary key (user_id, hevy_workout_id)
);

create index hevy_workout_links_session_idx on public.hevy_workout_links (session_id);

-- Learned exercise matches, kept per user so one bad guess never leaks into
-- anybody else's library.
create table public.hevy_exercise_map (
  user_id            uuid not null references auth.users on delete cascade,
  hevy_template_id   text not null,
  exercise_id        uuid not null references public.exercises on delete cascade,
  hevy_title         text not null,
  auto_matched       boolean not null default true,
  created_at         timestamptz not null default now(),
  primary key (user_id, hevy_template_id)
);

alter table public.hevy_connections   enable row level security;
alter table public.hevy_workout_links enable row level security;
alter table public.hevy_exercise_map  enable row level security;
-- Deliberately no policies. Only the service role reaches these, through the
-- sync route and the settings actions.

alter table public.workout_sessions
  add column source text not null default 'app' check (source in ('app', 'hevy')),
  -- Free-text title Hevy gave the workout, kept when no routine day matched.
  add column source_title text;

create index workout_sessions_source_idx on public.workout_sessions (user_id, source);
