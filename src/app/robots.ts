import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * The dashboard and the request endpoint are disallowed here as a courtesy
 * to well-behaved crawlers, not as protection. What actually keeps them out
 * is that the dashboard renders nothing without a team session and the
 * endpoint only accepts writes. A robots file is a request, and anything
 * that ignores it was never going to be stopped by one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/dashboard/", "/api/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
