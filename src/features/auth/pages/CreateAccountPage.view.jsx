import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, Clock } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

const OTP_LENGTH = 6;

export function CreateAccountView({ model }) {
  const {
    step,
    displayName,
    setDisplayName,
    email,
    setEmail,
    registrationToken,
    setRegistrationToken,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    otp,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    showPassword,
    setShowPassword,
    error,
    isLoading,
    isResending,
    cooldown,
    handleSubmitDetails,
    handleVerify,
    handleResend,
    handleEditEmail,
  } = model;

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
          {step === 'details' ? (
            <>
              <div className="mb-6">
                <h1 className="font-display mt-8 mb-2 text-3xl font-bold tracking-tight text-foreground">
                  Create administrator account
                </h1>
                <p className="text-sm text-foreground-light">
                  Enter your invitation token, then we&apos;ll send a one-time verification code
                  to confirm your email address.
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg flex items-start">
                  <div className="flex-1 text-sm text-danger font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmitDetails} className="flex flex-col space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    inputClassName="h-[34px] rounded-md text-base md:text-sm leading-4"
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-email">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={Mail}
                    inputClassName="h-[34px] rounded-md text-base md:text-sm leading-4"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-token">Registration Token</Label>
                  <Input
                    id="signup-token"
                    type="password"
                    placeholder="Provided by the admin who invited you"
                    value={registrationToken}
                    onChange={(e) => setRegistrationToken(e.target.value)}
                    icon={Lock}
                    inputClassName="h-[34px] rounded-md text-base md:text-sm leading-4"
                    required
                    autoComplete="off"
                  />
                  <p className="text-xs text-foreground-lighter">
                    Required if you were invited by an admin. This is the token from the
                    invitation email.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={Lock}
                      inputClassName="h-[34px] rounded-md pr-10 text-base md:text-sm leading-4"
                      required
                      minLength={8}
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

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={Lock}
                    inputClassName="h-[34px] rounded-md text-base md:text-sm leading-4"
                    required
                    minLength={8}
                  />
                </div>

                <div className="border-t border-border"></div>

                <Button
                  type="submit"
                  className="w-full h-[38px] px-4 text-base md:text-sm"
                  size="lg"
                  isLoading={isLoading}
                >
                  Send Verification Code
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
            </>
          ) : (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleEditEmail}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-link transition-colors hover:underline"
                >
                  <ArrowLeft size={14} /> Change email
                </button>
                <h1 className="font-display mt-4 mb-2 text-3xl font-bold tracking-tight text-foreground">
                  Verify your email
                </h1>
                <p className="text-sm text-foreground-light">
                  Enter the 6-digit code we sent to{' '}
                  <span className="font-medium text-foreground">{email}</span>. The code expires
                  shortly.
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg flex items-start">
                  <div className="flex-1 text-sm text-danger font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleVerify} className="flex flex-col space-y-4">
                <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                  {Array.from({ length: OTP_LENGTH }, (_, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={otp[index]}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      aria-label={`Digit ${index + 1}`}
                      className="h-12 w-10 rounded-lg border border-border bg-card text-center text-lg font-semibold text-foreground shadow-sm transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full h-[38px] px-4 text-base md:text-sm"
                  size="lg"
                  isLoading={isLoading}
                >
                  Verify & Create Account
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <span className="text-foreground-light">Didn&apos;t receive it?</span>
                {cooldown > 0 ? (
                  <span className="inline-flex items-center gap-1 text-foreground-lighter">
                    <Clock size={14} /> Resend in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={isResending}
                    className="underline transition text-brand-link hover:text-brand-link/80 disabled:opacity-50"
                  >
                    {isResending ? 'Sending…' : 'Resend code'}
                  </button>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-foreground-lighter">
                <ShieldCheck size={14} className="text-success" />
                Protected by email verification.
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
