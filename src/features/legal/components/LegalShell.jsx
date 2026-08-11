import { Link } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';

export function LegalShell({ title, effectiveDate, variant = 'public', children }) {
  const admin = variant === 'admin';
  const backTo = admin ? '/admin/profile' : '/login';
  const backLabel = admin ? 'Back to Profile' : 'Back to sign in';

  return (
    <div
      className={
        admin
          ? 'font-sans'
          : 'min-h-screen bg-background flex flex-col font-sans'
      }
    >
      {!admin && (
        /* Top Nav */
        <nav className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl px-8 pt-6 pb-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between sm:h-10">
              <Link
                to="/login"
                className="flex shrink-0 grow items-center space-x-3 lg:grow-0"
                aria-label="A-yos Admin"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 font-display text-base font-bold text-brand-700 dark:text-brand-300">
                  A
                </div>
                <span className="font-display text-lg font-bold tracking-tight text-foreground">
                  A-yos Admin
                </span>
              </Link>
              <span className="hidden items-center gap-2 text-sm text-foreground-lighter sm:flex">
                <FileText className="size-4" />
                Legal
              </span>
            </div>
          </div>
        </nav>
      )}

      {/* Content */}
      <main
        className={
          admin
            ? 'w-full max-w-3xl mx-auto py-6'
            : 'flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 py-10'
        }
      >
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-link hover:underline transition-colors mb-6"
        >
          <ChevronLeft className="size-4" /> {backLabel}
        </Link>

        <article>
          <header className="mb-8 border-b border-border pb-6">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm text-foreground-lighter">
              Effective date: {effectiveDate}
            </p>
          </header>

          <div className="space-y-8">{children}</div>
        </article>
      </main>

      {/* Footer */}
      {!admin && (
        <footer className="border-t border-border bg-card">
          <div className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-xs text-foreground-lighter">
              &copy; {new Date().getFullYear()} A-yos Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-foreground-lighter">
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export function LegalSection({ heading, children }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold tracking-tight text-foreground mb-3">
        {heading}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground-light">{children}</div>
    </section>
  );
}
