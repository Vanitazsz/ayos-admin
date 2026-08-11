import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
import { loadSystemStatus, updatePassword } from '../../../services/auth';

const messageFrom = (error) =>
  error instanceof Error ? error.message : 'The request could not be completed.';

export function useLoginController() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [systemStatus, setSystemStatus] = useState('Checking');
  const { login, logout, recoverySession, clearRecovery } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';
  const signupComplete = Boolean(location.state?.signupComplete);

  const isRecovery = recoverySession || localStorage.getItem('ayos-recovery-pending') === '1';

  useEffect(() => {
    const controller = new AbortController();
    void loadSystemStatus(controller.signal)
      .then(setSystemStatus)
      .catch((loadError) => {
        if (loadError?.name !== 'AbortError') setSystemStatus('Unavailable');
      });
    return () => controller.abort();
  }, []);

  const handleRecoverySubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(newPassword);
      clearRecovery();
      await logout();
      setResetComplete(true);
    } catch (recoveryError) {
      setError(messageFrom(recoveryError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    if (isRecovery) {
      await handleRecoverySubmit(event);
      return;
    }
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(messageFrom(loginError));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    error,
    handleSubmit,
    isLoading,
    isRecovery,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    resetComplete,
    signupComplete,
    password,
    setEmail,
    setPassword,
    setShowPassword,
    showPassword,
    systemStatus,
  };
}
