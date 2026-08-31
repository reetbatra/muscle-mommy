-- Food memory.
--
-- A photo of paneer tells you it is paneer. It does not tell you whether this
-- person eats 100g or 200g of it, and guessing that wrong is the single
-- biggest source of error in the whole calorie estimate.
--
-- So the app remembers. Every food logged is recorded with the portion that
-- was actually accepted, and those portions are handed to the model next time
-- as "this is what she usually has". Stated quantities always win over both.

create table public.food_memories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  -- Normalised for matching: lowercase, no punctuation, singular-ish.
  key          text not null,
  name         text not null,
  portion      text not null,
  kcal         integer not null default 0 check (kcal >= 0),
  protein_g    numeric(6,1) not null default 0,
  carbs_g      numeric(6,1) not null default 0,
  fat_g        numeric(6,1) not null default 0,
  fiber_g      numeric(6,1) not null default 0,
  times_logged integer not null default 1,
  -- Set by hand when the user says "this is always my portion". Pinned
  -- entries are never overwritten by a later estimate.
  is_pinned    boolean not null default false,
  last_used_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (user_id, key)
);

create index food_memories_rank_idx
  on public.food_memories (user_id, is_pinned desc, times_logged desc);

alter table public.food_memories enable row level security;

create policy "own rows" on public.food_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- What the user typed alongside the photo, kept so a re-estimate can use it.
alter table public.meals
  add column note text;

-- 'text' joins photo, manual and quick: described in words, no picture.
alter table public.meals
  drop constraint meals_source_check;
alter table public.meals
  add constraint meals_source_check
  check (source in ('photo', 'manual', 'quick', 'text'));
