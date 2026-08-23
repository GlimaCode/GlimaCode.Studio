-- 011  Typography corrections in the published portfolio copy.
--
-- Found in the pre-outreach review. Three edits, no schema change, and every
-- one of them is idempotent: each uses replace(), so running this twice does
-- nothing the second time.
--
-- WHY THIS IS A MIGRATION AND NOT A DASHBOARD EDIT
--
-- Two of the three strings are mirrored word for word by the home board,
-- which reads them from src/i18n/dictionaries/en.ts. Editing the row in the
-- dashboard without the matching commit would leave the home page quoting the
-- old text. The dictionary side of this change is already committed, so
-- `npm run verify:copy-sync` FAILS until this file is applied — that is the
-- guard doing its job, not a fault. Apply this and it goes green.

-- ---------------------------------------------------------------------------
-- 1. Thousands separator, Persian.
--
-- The English sentence reads "1,807 models and 15,257 individual model-year
-- records". The Persian one had ۱۸۰۷ next to ۱۵٬۲۵۷ — one grouped, one not, in
-- the same clause. U+066C is the Arabic thousands separator and is already
-- used correctly by the larger number, so this makes the smaller one match.
--
-- ۱۹۸۰ in the same sentence is deliberately left alone: it is a year, and
-- English does not group it either. All three case studies were checked; this
-- is the only number in the set that needed it.
update public.portfolio_projects
   set description_fa = replace(description_fa, '۱۸۰۷ مدل', '۱٬۸۰۷ مدل')
 where slug = 'vehicle-catalog'
   and description_fa like '%۱۸۰۷ مدل%';

-- ---------------------------------------------------------------------------
-- 2 and 3. Typographic apostrophes, English.
--
-- The English copy now uses U+2019 throughout. These two rows carry the only
-- straight apostrophes left in published prose. The first is mirrored by the
-- home board and is what turns verify:copy-sync green again; the second is not
-- mirrored, and is corrected so the portfolio does not contradict itself.
update public.portfolio_projects
   set summary_en = replace(summary_en, 'what''s wrong', 'what’s wrong')
 where slug = 'listing-quality-auditor'
   and summary_en like '%what''s wrong%';

update public.portfolio_projects
   set problem_en = replace(problem_en, 'storefront''s own style', 'storefront’s own style')
 where slug = 'title-batch-generator'
   and problem_en like '%storefront''s own style%';

-- ---------------------------------------------------------------------------
-- What changed, for the record.
select slug,
       description_fa like '%۱٬۸۰۷%'      as fa_number_grouped,
       summary_en     like '%what’s%'      as summary_apostrophe,
       problem_en     like '%storefront’s%' as problem_apostrophe
  from public.portfolio_projects
 where slug in ('vehicle-catalog', 'listing-quality-auditor', 'title-batch-generator')
 order by slug;
