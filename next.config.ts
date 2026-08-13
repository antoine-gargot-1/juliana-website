import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Local assets only; keep modern formats for the LCP hero.
    formats: ['image/avif', 'image/webp'],
  },
  /*
   * Next 16.3 writes AGENTS.md and a CLAUDE.md containing `@AGENTS.md` into the
   * repo root on every dev and build. Turned off rather than gitignored.
   *
   * Gitignoring hides the files from git; it does not stop them being written, and
   * an AI agent working in this checkout reads them off disk regardless. So the
   * effect of leaving it on is that a framework upgrade can silently inject
   * instructions into the context of anyone — human or agent — working here, and
   * those instructions arrive with a build rather than through review.
   *
   * That is a supply-chain shape worth refusing on principle, and the practical
   * cost is nil: the guidance is Next's own documentation, which is available
   * without being written into a project that did not ask for it. The .gitignore
   * entries stay as a backstop in case this flag is ever dropped.
   */
  agentRules: false,
};

export default nextConfig;
