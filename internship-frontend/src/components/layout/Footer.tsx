import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[color:var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
              aria-label="Portal home"
            >
              <span
                className="
                  grid h-10 w-10 place-items-center rounded-xl
                  bg-gradient-to-br
                  from-[color:var(--color-primary)]
                  via-[color:var(--color-accent-purple)]
                  to-[color:var(--color-accent-cyan)]
                  shadow-sm ring-1 ring-black/10 dark:ring-white/10
                "
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
                  <path
                    d="M12 4.25c4.28 0 7.75 3.47 7.75 7.75S16.28 19.75 12 19.75 4.25 16.28 4.25 12 7.72 4.25 12 4.25Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M12 8.1c2.15 0 3.9 1.75 3.9 3.9s-1.75 3.9-3.9 3.9-3.9-1.75-3.9-3.9 1.75-3.9 3.9-3.9Z"
                    fill="currentColor"
                    opacity="0.95"
                  />
                </svg>
              </span>
              <span>
                <span className="block text-lg font-semibold leading-5 text-[var(--text-primary)]">Portal</span>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                  A modern workspace for everyday ops.
                </span>
              </span>
            </Link>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Unified workspace for tasks, commerce, and engineering insights.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)]">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">Dashboard</a></li>
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">Analytics</a></li>
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)]">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">About</a></li>
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">Security</a></li>
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">Careers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)]">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">Help Center</a></li>
              <li><a className="hover:text-[var(--text-primary)] transition-colors" href="#">Contact</a></li>
              <li><span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-500">All systems operational</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[color:var(--border-subtle)] pt-4 text-xs text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Portal, Inc. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] dark:hover:bg-white/10"
                aria-label="GitHub"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.77.6-3.35-1.17-3.35-1.17-.45-1.15-1.1-1.46-1.1-1.46-.9-.62.07-.61.07-.61 1 .07 1.52 1.03 1.52 1.03.89 1.52 2.34 1.08 2.91.83.09-.64.35-1.08.63-1.33-2.21-.25-4.53-1.11-4.53-4.95 0-1.1.39-2 1.03-2.71-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.9-1.3 2.74-1.03 2.74-1.03.55 1.38.21 2.4.1 2.65.64.71 1.03 1.61 1.03 2.71 0 3.85-2.33 4.7-4.55 4.95.36.31.68.92.68 1.86v2.75c0 .26.18.57.69.48A10 10 0 0 0 12 2Z" />
                </svg>
              </a>
              <a
                href="#"
                className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] dark:hover:bg-white/10"
                aria-label="LinkedIn"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.5 23.5h4V7.98h-4V23.5ZM8.5 7.98h3.83v2.12h.05c.53-1 1.83-2.12 3.77-2.12 4.03 0 4.78 2.65 4.78 6.1v9.42h-4v-8.35c0-2-.04-4.57-2.78-4.57-2.78 0-3.2 2.17-3.2 4.42v8.5h-4V7.98Z" />
                </svg>
              </a>
              <a
                href="#"
                className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] dark:hover:bg-white/10"
                aria-label="X (Twitter)"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M18.9 2H22l-6.8 7.77L23 22h-6.2l-4.86-6.27L6.5 22H2l7.35-8.4L1.6 2h6.35l4.4 5.6L18.9 2Zm-1.08 18.1h1.72L7.06 3.78H5.2l12.62 16.32Z" />
                </svg>
              </a>
            </div>
            <span className="text-[var(--text-secondary)]">Terms · Privacy · Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
