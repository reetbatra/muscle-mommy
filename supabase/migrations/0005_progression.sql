-- Progression settings.
--
-- Two things drive every target this app prints: how many reps count as "all
-- sets done" for an exercise, and what the next available weight actually is.
-- The second one is hardware, not maths: a dumbbell rack jumps 2.5kg at a
-- time and a pin-loaded stack jumps 5kg, and the app has to know which.

alter table public.profiles
  add column dumbbell_rack numeric(5,2)[] not null
    default '{2.5,5,7.5,10,12.5,15,17.5,20,22.5,25,30}',
  add column machine_increment_kg numeric(4,2) not null default 5,
  add column barbell_increment_kg numeric(4,2) not null default 2.5;

alter table public.routine_days
  add column rest_after boolean not null default false;

alter table public.routine_exercises
  add column load_type text not null default 'machine'
    check (load_type in ('machine', 'dumbbell_pair', 'dumbbell_single', 'barbell', 'bodyweight', 'banded')),
  -- Overrides the derived increment when a specific machine is odd.
  add column increment_kg numeric(5,2),
  -- Reps may keep climbing past rep_high when the next weight is a huge jump.
  add column rep_ceiling_max smallint not null default 20,
  add column to_failure boolean not null default true;

-- Apple Health reports resting and active energy separately. Storing both
-- means the burn figure is measured rather than guessed.
alter table public.health_days
  add column basal_kcal integer,
  add column workout_kcal integer;

-- Estimated energy cost of a logged lifting session, kept next to the session
-- so the number never changes retroactively when body weight does.
alter table public.workout_sessions
  add column estimated_kcal integer;

-- Extra movements the Upper/Lower template needs.
insert into public.exercises (user_id, name, muscle_group, equipment) values
  (null, 'Banded Push-Up',                   'Chest',     'Band'),
  (null, 'Banded Pull-Up',                   'Back',      'Band'),
  (null, 'Single-Arm Cable Row',             'Back',      'Cable'),
  (null, 'Single-Arm Overhead Triceps Extension', 'Triceps', 'Dumbbell'),
  (null, 'Single-Arm Lat Pulldown',          'Back',      'Cable'),
  (null, 'Dumbbell Shoulder Press',          'Shoulders', 'Dumbbell')
on conflict do nothing;

-- Some movements have a gym name and a personal name. Both should be allowed
-- without forking the exercise, because history is keyed on the exercise.
alter table public.routine_exercises
  add column display_name text;
