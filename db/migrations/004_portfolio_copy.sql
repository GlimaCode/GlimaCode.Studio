-- 004  Case-study copy for the seeded projects, in both locales.
--
-- Appended rather than folded into 003, which stays byte-identical to the
-- reviewed version. This also carries the revised auditor summary, which
-- leads with what a reader gets instead of with the principle behind it.
--
-- The Persian is not a translation of the English. It was written natively,
-- so sentences differ in length and a few say something slightly different
-- where the English idiom has no Persian equivalent. Brand and technology
-- names stay in Latin script; figures are in Persian-Indic digits.
--
-- Dollar-quoted throughout so apostrophes need no escaping.
--
-- Idempotent: an UPDATE keyed by slug, safe to re-run.

update public.portfolio_projects set
  summary_en = $txt$A product-data quality auditor that reports what's wrong and proves it, without touching your catalogue. Rules live as data, so changing one takes an edit rather than a release. Zero dependencies, 13 tests.$txt$,
  summary_fa = $txt$یک ممیز کیفیت داده‌ی محصول که مشکل را پیدا می‌کند و مدرکش را نشان می‌دهد، بدون اینکه به کاتالوگ شما دست بزند. قوانین به‌صورت داده ذخیره می‌شوند، پس تغییر یک قانون یک ویرایش است نه یک نسخه‌ی جدید. صفر وابستگی، ۱۳ تست.$txt$,
  problem_en = $txt$Large e-commerce catalogues drift. Titles pick up typos, variants start contradicting the listing they belong to, specifications stop matching the item, prices go stale against the price list. At tens of thousands of listings nobody can find these by hand — and a tool that silently corrects them is worse than the drift, because now the errors are invisible.$txt$,
  problem_fa = $txt$کاتالوگ‌های بزرگ فروشگاهی به‌مرور از ریخت می‌افتند. غلط تایپی وارد عنوان‌ها می‌شود، تنوع‌های یک محصول با خودِ محصول تناقض پیدا می‌کنند، مشخصات فنی با کالا نمی‌خواند، و قیمت‌ها از لیست اصلی عقب می‌مانند. وقتی ده‌ها هزار محصول دارید، هیچ‌کس نمی‌تواند این‌ها را دستی پیدا کند — و ابزاری که بی‌سروصدا خودش «اصلاح» کند از خود مشکل بدتر است، چون حالا خطاها نامرئی شده‌اند.$txt$,
  description_en = $txt$An auditor that reads a catalogue export, checks every row, and produces a prioritised report. It never edits the source and never fixes anything: a person decides what changes.

Every finding comes with the evidence behind it, so nothing has to be taken on trust. When a check cannot be verified — a missing field, an incomplete row — it says so and names what it needed, rather than passing quietly. Auditors that skip what they cannot judge produce clean reports and false confidence.

The rules live as versioned data rather than in code, so changing one is an edit and a version bump, not a development cycle. Built against catalogues in the tens of thousands of listings, it runs on zero dependencies and is covered by 13 tests.$txt$,
  description_fa = $txt$ابزاری که خروجی کاتالوگ را می‌خواند، تک‌تک ردیف‌ها را بررسی می‌کند و یک گزارش اولویت‌بندی‌شده می‌دهد. هیچ‌وقت فایل اصلی را تغییر نمی‌دهد و هیچ‌وقت چیزی را خودش «درست» نمی‌کند: تصمیم با آدم است.

پشت هر ایراد، مدرکش هم می‌آید — چیزی نیست که مجبور باشید بی‌دلیل قبولش کنید. و وقتی بررسی یک ردیف ممکن نیست — فیلدی خالی مانده، اطلاعاتی ناقص است — همین را می‌گوید و نام می‌برد که چه چیزی کم داشته، نه اینکه بی‌صدا از کنارش رد شود. ابزاری که هرچه را نمی‌تواند بسنجد نادیده بگیرد، گزارش تمیز می‌دهد و اعتماد کاذب می‌سازد.

قوانین به‌جای اینکه داخل کد باشند، به‌صورت داده‌ی نسخه‌دار ذخیره می‌شوند؛ پس تغییر یک قانون یعنی یک ویرایش و یک شماره‌ی نسخه، نه یک چرخه‌ی توسعه. روی کاتالوگ‌هایی در مقیاس ده‌ها هزار محصول ساخته شده، بدون هیچ وابستگی خارجی، و ۱۳ تست پوششش می‌دهند.$txt$
where slug = 'listing-quality-auditor';

update public.portfolio_projects set
  summary_fa = $txt$کاتالوگ استاندارد داده‌ی خودرو با جستجویی که می‌گوید چرا هر نتیجه را برگردانده، سیستم نام‌های جایگزین برای ورودی‌های نامرتب، ورک‌فلوی بازبینی، و خروجی اکسل برای تیم‌های بعدی.$txt$,
  problem_en = $txt$Vehicle data arrives in whatever shape its source used — F150 or F-150, Mercedes Benz or Mercedes-Benz, trim names glued onto model names. Teams end up matching records by eye, the same vehicle gets recorded three different ways, and every report downstream inherits the mess.$txt$,
  problem_fa = $txt$داده‌ی خودرو به هر شکلی که منبعش نوشته وارد می‌شود — یکی F150 می‌نویسد و دیگری F-150، یکی Mercedes Benz و دیگری Mercedes-Benz، و اسم تیپ چسبیده به اسم مدل. آخرش آدم‌ها مجبورند رکوردها را چشمی تطبیق بدهند، یک خودرو به سه شکل مختلف ثبت می‌شود، و این آشفتگی به تمام گزارش‌های بعدی هم منتقل می‌شود.$txt$,
  description_en = $txt$A searchable catalogue of standardised vehicle data: 75 manufacturers, 1,807 models and 15,257 individual model-year records, covering 1980 onward.

The search is the part people notice. It ignores case, spacing, punctuation and hyphens, so F150 finds the Ford F-150 and Mercedes Benz finds Mercedes-Benz. Exact matches come first, alias matches are labelled as such, and every result explains why it matched instead of leaving you to work it out.

An alias system absorbs messy input so the next file can be standardised against it, a review workflow handles anything unresolved, and the whole catalogue exports to Excel or CSV for people working outside the app. We never touch your source files — they are opened read-only, and every import records hashes and row counts, so any figure can be traced back to exactly what was read.$txt$,
  description_fa = $txt$یک کاتالوگ جستجوپذیر از داده‌ی استانداردشده‌ی خودرو: ۷۵ برند، ۱۸۰۷ مدل و ۱۵٬۲۵۷ رکورد سال‌مدل، از ۱۹۸۰ به بعد.

جستجو همان بخشی است که کاربر فوراً متوجهش می‌شود. به بزرگی و کوچکی حروف، فاصله، نقطه‌گذاری و خط تیره کاری ندارد — پس F150 همان Ford F-150 را پیدا می‌کند و Mercedes Benz همان Mercedes-Benz را. تطابق‌های دقیق اول می‌آیند، تطابق‌های نام جایگزین جداگانه برچسب می‌خورند، و هر نتیجه توضیح می‌دهد چرا برگردانده شده، نه اینکه خودتان حدس بزنید.

سیستم نام‌های جایگزین ورودی‌های نامرتب را جذب می‌کند تا فایل بعدی با همان استاندارد شود، ورک‌فلوی بازبینی موارد بلاتکلیف را جمع می‌کند، و کل کاتالوگ برای کسانی که بیرون از برنامه کار می‌کنند به Excel یا CSV خروجی می‌گیرد. به فایل‌های اصلی شما دست نمی‌زنیم — فقط خوانده می‌شوند، و هر بار که چیزی وارد سیستم می‌شود، هش و تعداد ردیف‌ها ثبت می‌شود؛ پس هر عددی را می‌شود دقیقاً تا منبعش دنبال کرد.$txt$
where slug = 'vehicle-catalog';

update public.portfolio_projects set
  summary_fa = $txt$موتور قانون‌محوری که برای صدها محصول همزمان عنوان استاندارد می‌سازد — قطعی، قابل ردیابی، و کاملاً داخل مرورگر، طوری که هیچ داده‌ای از سیستم شما بیرون نمی‌رود.$txt$,
  problem_en = $txt$Selling the same product through several storefronts means writing the same listing title several times, each in that storefront's own style, without any of them contradicting the others. Done by hand, the first fifty are tedious and the next five hundred are inconsistent — and inconsistency across storefronts is the kind of error nobody notices until a customer does.$txt$,
  problem_fa = $txt$وقتی یک محصول را در چند فروشگاه می‌فروشید، باید عنوانش را چند بار بنویسید — هر بار به سبک همان فروشگاه، و طوری که هیچ‌کدام با دیگری تناقض نداشته باشد. دستی که انجامش بدهید، پنجاه‌تای اول خسته‌کننده است و پانصدتای بعدی ناهماهنگ — و ناهماهنگی بین فروشگاه‌ها از آن خطاهایی است که تا مشتری به رویتان نیاورد، کسی متوجهش نمی‌شود.$txt$,
  description_en = $txt$A generator that turns one product entry into a title for every storefront at once — nine core variations, with around sixty more on demand — together with the search text each listing needs.

Existing catalogues can be uploaded and rewritten in bulk. Rows the engine is confident about come back converted; rows it is not go to a separate file for review, each flagged with the reason. That is the same principle as the auditor above, and it is deliberate rather than a coincidence: where a tool cannot be sure, it should say so instead of guessing, because a silent wrong answer costs far more than an obvious gap.

It runs entirely in your browser. No server, no external service, nothing leaving the machine — which matters when handing your whole catalogue to someone else is not an option. The rules are deterministic, so the same input always produces the same output.$txt$,
  description_fa = $txt$موتوری که از یک ورودی محصول، همزمان برای هر فروشگاه یک عنوان می‌سازد — نُه حالت اصلی و حدود شصت حالت دیگر در صورت نیاز — به‌همراه متن جستجویی که هر آگهی لازم دارد.

کاتالوگ‌های موجود را هم می‌شود یکجا بارگذاری و بازنویسی کرد. ردیف‌هایی که موتور مطمئن است، تبدیل‌شده برمی‌گردند؛ ردیف‌هایی که مطمئن نیست، با ذکر دلیل می‌روند در یک فایل جدا برای بازبینی. این دقیقاً همان اصلی است که در ممیز بالا هم دیدید و اتفاقی نیست: جایی که ابزار مطمئن نیست، باید بگوید نمی‌داند، نه اینکه حدس بزند — چون یک جواب غلطِ بی‌سروصدا خیلی گران‌تر از یک جای خالیِ آشکار تمام می‌شود.

همه‌چیز داخل مرورگر خودتان اجرا می‌شود. نه سروری، نه سرویس بیرونی، نه داده‌ای که از سیستم خارج شود — و این وقتی اهمیت پیدا می‌کند که سپردن کل کاتالوگ به یک شرکت دیگر اصلاً گزینه نباشد. قوانین قطعی‌اند، پس یک ورودی مشخص همیشه همان خروجی را می‌دهد.$txt$
where slug = 'title-batch-generator';

-- Persian labels for the categories, so the filter chips read natively.
update public.portfolio_categories set label_fa = 'لندینگ‌پیج'   where slug = 'landing-page';
update public.portfolio_categories set label_fa = 'داشبورد ادمین' where slug = 'admin-dashboard';
update public.portfolio_categories set label_fa = 'وب‌اپلیکیشن'   where slug = 'web-app';
update public.portfolio_categories set label_fa = 'ابزار داده'    where slug = 'data-tool';
