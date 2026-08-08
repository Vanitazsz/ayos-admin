import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

export function LoginView({ model }) {
  const {
    email,
    error,
    handleSubmit,
    isLoading,
    password,
    setEmail,
    setPassword,
    setShowPassword,
    showPassword,
    systemStatus,
  } = model;
  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans">
      {/* Top Nav */}
      <nav className="absolute top-0 w-full mx-auto mt-6 px-8 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between sm:h-10">
          <div className="flex items-center grow shrink-0 lg:grow-0 space-x-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 font-display text-base font-bold text-brand-700 dark:text-brand-300">
              A
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              A-yos Admin
            </span>
          </div>
          <div className="hidden items-center md:ml-10 md:flex md:pr-4">
            <div className="flex h-[26px] items-center rounded-md bg-card border border-border px-2.5 py-1 shadow-sm">
              <ShieldCheck className="size-3.5 text-success" />
              <span className="ml-1.5 text-xs font-medium text-foreground">
                Enterprise-grade security
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 h-full">
        {/* Left Column - Sign In Form */}
        <main className="flex flex-1 shrink-0 flex-col items-center px-5 pt-16 pb-8 border-r border-border shadow-lg bg-card">
          <div className="flex-1 flex w-[330px] sm:w-[384px] flex-col justify-center">
            <div className="mb-10">
              <h1 className="font-display mt-8 mb-2 text-3xl font-bold tracking-tight text-foreground">
                Welcome Back
              </h1>
              <p className="text-sm text-foreground-light">
                Please sign in to your administrator account.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg flex items-start">
                <div className="flex-1 text-sm text-danger font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Administrator email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={Mail}
                    inputClassName="h-[34px] rounded-md text-base md:text-sm leading-4"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-brand-link hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={Lock}
                      inputClassName="h-[34px] rounded-md pr-10 text-base md:text-sm leading-4"
                      required
                    />
                    <button
                      type="button"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1 flex h-[26px] items-center justify-center rounded-md px-1.5 text-foreground-muted hover:text-foreground focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-[42px] px-4 text-base"
                  size="lg"
                  isLoading={isLoading}
                >
                  Sign in to Dashboard
                </Button>
              </form>
          </div>

          <div className="text-center text-balance">
            <p className="text-xs text-foreground-lighter sm:mx-auto sm:max-w-sm">
              By continuing, you agree to A-yos&apos;s{' '}
              <a
                href="#"
                className="underline transition decoration-inherit hover:decoration-foreground text-inherit hover:text-foreground"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#"
                className="underline transition decoration-inherit hover:decoration-foreground text-inherit hover:text-foreground"
              >
                Privacy Policy
              </a>
              .
            </p>
            <div className="mt-2 flex items-center justify-center text-xs text-foreground-lighter">
              System Status:{' '}
              <span
                className={`ml-1 font-medium ${systemStatus === 'Operational' ? 'text-success' : systemStatus === 'Unavailable' ? 'text-danger' : 'text-foreground-light'}`}
              >
                {systemStatus}
              </span>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Brand/Illustration */}
        <aside className="hidden xl:flex flex-1 basis-1/4 flex-col items-center justify-center bg-background">
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground mb-4">
              Manage the A-yos ecosystem securely.
            </h2>
            <p className="text-base text-foreground-light leading-relaxed mb-8">
              One centralized platform to oversee users, workers, bookings, and payments with
              powerful analytics and controls.
            </p>
            <div className="text-sm text-foreground-muted">
              &copy; {new Date().getFullYear()} A-yos Platform. All rights reserved.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
