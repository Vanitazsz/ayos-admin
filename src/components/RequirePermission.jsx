import React from 'react';
import { useAuth } from '../context/AuthContext';

const RequirePermission = ({ permission, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <svg
          className="h-12 w-12 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3.5 21L12 3L20.5 21M7 15L17 15" pathLength="100" className="opacity-25" />
          <path
            d="M3.5 21L12 3L20.5 21M7 15L17 15"
            pathLength="100"
            strokeDasharray="20 80"
            className="a-loader-dash"
          />
        </svg>
      </div>
    );
  }

  if (!user?.permissions?.includes(permission)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 14v4" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 6v4" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Access denied</h1>
          <p className="mt-2 text-sm text-foreground-lighter">
            You don't have permission to view this page. Contact an administrator to request
            access.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default RequirePermission;
