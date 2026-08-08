import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

export function ForgotPasswordView({ model }) {
  const { email, error, handleSubmit, isLoading, setEmail, successMsg } = model;
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Nav */}
      <nav className="sticky top-0 mx-auto w-full max-w-7xl px-8 pt-6 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between sm:h-10">
          <div className="flex shrink-0 grow items-center space-x-3 lg:grow-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 font-display text-base font-bold text-brand-700 dark:text-brand-300">
              A
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              A-yos Admin
            </span>
          </div>
        </div>
      </nav>

      {/* Centered Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-8">
        <main className="flex w-full max-w-[448px] flex-col px-5">
          <div className="mb-6">
            <h1 className="font-display mt-8 mb-2 text-3xl font-bold tracking-tight text-foreground">
              Forgot your password?
            </h1>
            <p className="text-sm text-foreground-light">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg flex items-start">
              <div className="flex-1 text-sm text-danger font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-success/10 border-l-4 border-success p-4 rounded-r-lg flex items-start">
              <div className="flex-1 text-sm text-success font-medium">{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col pt-4 space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="Administrator email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                inputClassName="h-[34px] rounded-md text-base md:text-sm leading-4"
                required
              />
            </div>

            <div className="border-t border-border"></div>

            <Button
              type="submit"
              className="w-full h-[38px] px-4 text-base md:text-sm"
              size="lg"
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>
          </form>

          <div className="my-8 self-center text-sm">
            <span className="text-foreground-light">Already have an account?</span>{' '}
            <Link
              to="/login"
              className="underline transition text-brand-link hover:text-brand-link/80"
            >
              Sign In
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
