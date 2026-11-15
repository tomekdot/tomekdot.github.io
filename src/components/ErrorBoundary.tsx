/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  compact?: boolean;
  lang?: 'en' | 'pl';
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onReset?.();
  };

  handleHardReload = () => {
    try {
      window.location.reload();
    } catch {
      this.handleRetry();
    }
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('github_repos_cache');
      localStorage.removeItem('github_sync_stats');
    } catch {
      // ignore storage errors
    }
    this.handleHardReload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.compact) {
      const isEn = this.props.lang === 'en';
      return (
        <div
          role="alert"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-mono"
        >
          <div className="max-w-md w-full bg-[#0D0D0D] border-2 border-rose-500/70 p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold uppercase tracking-wider">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{this.props.fallbackTitle || (isEn ? 'View Render Error' : 'Błąd ładowania widoku')}</span>
            </div>
            <p className="text-zinc-300 font-sans text-xs leading-relaxed break-words">
              {isEn
                ? 'An unexpected error occurred while rendering this window. You can retry or reload the page.'
                : 'Wystąpił nieoczekiwany błąd podczas otwierania tego okna. Możesz spróbować ponownie lub odświeżyć stronę.'}
            </p>
            {this.state.errorMessage && (
              <pre className="p-2 bg-neutral-950 border border-neutral-800 text-[10px] text-rose-300/90 overflow-x-auto whitespace-pre-wrap break-all">
                {this.state.errorMessage}
              </pre>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-3 py-1.5 bg-editorial-accent/15 hover:bg-editorial-accent/25 border border-editorial-accent text-editorial-accent hover:text-white font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                <span>{isEn ? 'Close / Retry' : 'Zamknij / Spróbuj ponownie'}</span>
              </button>
              <button
                type="button"
                onClick={this.handleHardReload}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border text-zinc-200 font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>{isEn ? 'Reload Page' : 'Odśwież stronę'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#050505] text-[#E6EDF3] flex items-center justify-center p-4 font-mono">
        <div className="max-w-lg w-full bg-[#0D0D0D] border-2 border-rose-500/60 p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle size={22} className="shrink-0" />
            <div>
              <h1 className="text-sm sm:text-base font-bold uppercase tracking-wider">
                Wykryto błąd renderowania aplikacji
              </h1>
              <p className="text-[11px] text-zinc-400">
                Application recovered safely to prevent a blank screen
              </p>
            </div>
          </div>

          {this.state.errorMessage && (
            <pre className="p-3 bg-neutral-950 border border-neutral-800 text-[11px] text-rose-300 overflow-x-auto whitespace-pre-wrap break-all">
              {this.state.errorMessage}
            </pre>
          )}

          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <button
              type="button"
              onClick={this.handleHardReload}
              className="px-3.5 py-2 bg-editorial-accent/15 hover:bg-editorial-accent/25 border border-editorial-accent text-editorial-accent hover:text-white font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Odśwież aplikację</span>
            </button>
            <button
              type="button"
              onClick={this.handleClearCacheAndReload}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border text-zinc-300 hover:text-white font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Wyczyść cache i odśwież</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
