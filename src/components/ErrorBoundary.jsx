import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error) {
    console.error('ErrorBoundary caught an error:', error);
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-2 break-words text-sm text-foreground-lighter">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
