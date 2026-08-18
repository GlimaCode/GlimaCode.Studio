import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <span>{siteConfig.brand} — designed &amp; built by two developers</span>
        <a href="/dashboard">Team access</a>
      </div>
    </footer>
  );
}
