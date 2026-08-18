import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The dev server writes tool-specific instruction files into the project
   * root by default. This project keeps its tree free of them, so the
   * behaviour is switched off at the source rather than filtered later.
   */
  agentRules: false,
};

export default nextConfig;
