-- 015  FocusBoard opens live.
--
-- Pages is now enabled on GlimaCode/focusboard and the workflow that was
-- already in the repository has deployed it. Setting live_url promotes the
-- project from tier 3 (the repository card) to tier 1 (the running page inside
-- the laptop) — the first project on this site to reach the top of the chain.
--
-- Checked before writing it, against the same three conditions
-- src/lib/data/embed.ts applies at render time:
--
--   https                     yes, so no mixed content
--   HTTP 200                  yes, and the body is FocusBoard rather than a
--                             404 page that happens to answer 200
--   X-Frame-Options           absent
--   CSP frame-ancestors       absent
--
-- If GitHub ever starts sending X-Frame-Options on Pages, nothing here breaks:
-- the server-side check refuses the embed and the showcase falls back to the
-- repository card on its own. That is what the chain is for.
--
-- The organisation's URL, not the personal one. The content is identical and
-- both are public; this is about whose name is under the work.
--
-- Idempotent.

update public.portfolio_projects
   set live_url = 'https://glimacode.github.io/focusboard/'
 where slug = 'focusboard'
   and live_url is distinct from 'https://glimacode.github.io/focusboard/';
