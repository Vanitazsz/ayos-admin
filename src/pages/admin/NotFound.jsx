import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
          <SearchX size={32} />
        </div>
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Page not found</h2>
        <p className="mt-3 text-foreground-lighter">
          The page you are looking for doesn’t exist or may have been moved.
        </p>
        <Link
          to="/admin/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Home size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
