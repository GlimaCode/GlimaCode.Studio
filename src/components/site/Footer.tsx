import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <span>{siteConfig.brand} — designed &amp; built by two developers</span>
        {/* The dashboard route does not exist yet, and the site is live, so
            the link stays hidden rather than sending anyone to a 404. */}
        {siteConfig.features.dashboard ? (
          <a href="/dashboard">Team access</a>
        ) : null}
      </div>
    </footer>
  );
}
