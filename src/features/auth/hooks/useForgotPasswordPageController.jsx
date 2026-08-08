import { useState } from 'react';

import { requestPasswordReset } from '../../../services/auth';

const messageFrom = (error) =>
  error instanceof Error ? error.message : 'The request could not be completed.';

export function useForgotPasswordPageController() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccessMsg('If an account exists, a reset link has been sent to your email.');
    } catch (resetError) {
      setError(messageFrom(resetError));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    error,
    handleSubmit,
    isLoading,
    setEmail,
    successMsg,
  };
}
