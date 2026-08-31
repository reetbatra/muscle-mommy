-- How much oil goes in the pan.
--
-- Invisible cooking fat is one of the largest single errors in estimating a
-- home-cooked meal, and it is not a guess the app should be making: it is a
-- fact about someone's kitchen. Assuming a tablespoon for a cook who uses one
-- spray adds about 110 kcal per dish, silently, every time.

alter table public.profiles
  add column cooking_oil text not null default 'light'
    check (cooking_oil in ('none', 'spray', 'light', 'moderate', 'generous'));
