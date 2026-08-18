import { siteConfig } from "@/config/site";

export function Nav() {
  return (
    <nav id="nav">
      <div className="nav-inner">
        <a className="logo" href="#top">
          &lt;<b>{siteConfig.brand}</b>/&gt;
        </a>
        <div className="nav-links">
          <a href="#work">Work</a>
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#team">Team</a>
          <a className="nav-cta" href="#start">
            Start a project
          </a>
        </div>
      </div>
    </nav>
  );
}
