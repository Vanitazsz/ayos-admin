import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN = 30;

const messageFrom = (error) => {
  const message = error instanceof Error ? error.message : 'The request could not be completed.';
  if (/EMAIL_CONFIRMATION_REQUIRED/.test(message)) {
    return 'Email confirmation is disabled on the server. Enable it in Supabase Authentication → Email → Confirm email to create accounts.';
  }
  if (/EMAIL_NOT_CONFIRMED/.test(message)) {
    return 'Your email could not be verified. Please request a new code and try again.';
  }
  if (/Invalid account role|Database error saving new user/.test(message)) {
    return 'The invitation token is invalid, expired, or was already used. Please contact an admin for a new invitation.';
  }
  return message;
};

export function useCreateAccountPageController() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('details');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [registrationToken, setRegistrationToken] = useState(searchParams.get('token') ?? '');
  const inviteRole = searchParams.get('role') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => () => clearInterval(cooldownTimerRef.current), []);

  const startCooldown = useCallback(() => {
    clearInterval(cooldownTimerRef.current);
    setCooldown(RESEND_COOLDOWN);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, []);

  const signUpMetadata = useCallback(() => {
    const metadata = { display_name: displayName.trim() };
    if (registrationToken.trim()) {
      metadata.admin_bootstrap_token = registrationToken.trim();
    }
    if (inviteRole) {
      metadata.admin_bootstrap_role = inviteRole;
    }
    return metadata;
  }, [displayName, registrationToken, inviteRole]);

  const handleSubmitDetails = async (event) => {
    event.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!registrationToken.trim()) {
      setError('An admin invitation token is required to create an administrator account.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: signUpMetadata(),
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signUpError) throw signUpError;

      if (signUpData.session) {
        throw new Error('EMAIL_CONFIRMATION_REQUIRED');
      }

      setStep('otp');
      startCooldown();
    } catch (signUpError) {
      setError(messageFrom(signUpError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setIsLoading(true);
    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'signup',
      });
      if (verifyError) throw verifyError;

      if (!verifyData.session) {
        throw new Error(
          'Your email was verified, but no session could be established. Please try again.',
        );
      }

      await supabase.auth.signOut();
      navigate('/login', { replace: true, state: { signupComplete: true } });
    } catch (verifyError) {
      setError(messageFrom(verifyError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsResending(true);
    try {
      const { data: resendData, error: resendError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: signUpMetadata(),
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (resendError) throw resendError;
      if (resendData.session) throw new Error('EMAIL_CONFIRMATION_REQUIRED');
      startCooldown();
    } catch (resendError) {
      setError(messageFrom(resendError));
    } finally {
      setIsResending(false);
    }
  };

  const handleEditEmail = () => {
    setStep('details');
    setOtp(Array(6).fill(''));
    setError('');
  };

  const handleOtpChange = useCallback((index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback(
    (index, event) => {
      if (event.key === 'Backspace' && !otp[index] && index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`);
        prevInput?.focus();
      }
    },
    [otp],
  );

  const handleOtpPaste = useCallback((event) => {
    event.preventDefault();
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    setOtp((current) => {
      const next = [...current];
      digits.split('').forEach((digit, index) => {
        next[index] = digit;
      });
      return next;
    });
    const target = document.getElementById(`otp-${Math.min(digits.length - 1, 5)}`);
    target?.focus();
  }, []);

  return {
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
  };
}
