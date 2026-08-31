-- Row level security. Nothing is readable across users.

alter table public.profiles          enable row level security;
alter table public.goals             enable row level security;
alter table public.habits            enable row level security;
alter table public.habit_logs        enable row level security;
alter table public.exercises         enable row level security;
alter table public.routine_days      enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.meals             enable row level security;
alter table public.health_days       enable row level security;
alter table public.cycle_days        enable row level security;
alter table public.body_comps        enable row level security;
alter table public.ingest_tokens     enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'goals', 'habits', 'habit_logs', 'routine_days', 'routine_exercises',
    'workout_sessions', 'workout_sets', 'meals', 'health_days',
    'cycle_days', 'body_comps'
  ]
  loop
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;

-- Exercises: everyone reads the shared starter library, writes only their own.
create policy "read library and own" on public.exercises
  for select using (user_id is null or auth.uid() = user_id);
create policy "insert own" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "update own" on public.exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.exercises
  for delete using (auth.uid() = user_id);

-- Ingest tokens: the client may list and revoke, never read the hash back
-- meaningfully (the hash is one-way) and never mint one directly.
create policy "read own tokens" on public.ingest_tokens
  for select using (auth.uid() = user_id);
create policy "revoke own tokens" on public.ingest_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own tokens" on public.ingest_tokens
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- private storage bucket for meal photos, one folder per user
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "own meal photos" on storage.objects
  for all
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
