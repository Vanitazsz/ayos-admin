import { useLoginController } from '../hooks/useLoginController';

export function useLoginPageController() {
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
  } = useLoginController();
  return {
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
  };
}
