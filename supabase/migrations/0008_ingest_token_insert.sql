-- Creating your own sync token is a normal thing for a signed-in user to do,
-- and the settings screen does it through their own session.
--
-- The original policy set covered select, update and delete but not insert,
-- on the assumption that tokens would only ever be minted by the service role.
-- They are not, so every attempt failed with "new row violates row-level
-- security policy".
--
-- The with-check clause is what makes this safe: a row can only be inserted
-- for yourself, so nobody can mint a token pointed at another account.

create policy "mint own tokens" on public.ingest_tokens
  for insert
  with check (auth.uid() = user_id);
