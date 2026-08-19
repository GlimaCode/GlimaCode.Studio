import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/config";

/**
 * Sends the bare domain to a locale.
 *
 * This honours an explicit prior choice stored in a cookie by the language
 * switcher, and falls back to English otherwise. It deliberately does not
 * look at Accept-Language: guessing from browser headers gets the diaspora
 * case wrong, sending a Persian speaker in Berlin somewhere they did not ask
 * to go.
 *
 * The redirect is temporary rather than permanent on purpose. A 308 would be
 * cached by the browser and by any CDN in front of us, so a visitor who
 * later switches language would keep being sent to the old one from a cache
 * we cannot reach.
 */
export default function proxy(request: NextRequest) {
  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: "/",
};
