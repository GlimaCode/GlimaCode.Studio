import { Logo } from "./Logo";

export function Nav() {
  return (
    <nav id="nav">
      <div className="nav-inner">
        <Logo />
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
