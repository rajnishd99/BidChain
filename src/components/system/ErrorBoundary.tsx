"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

/**
 * Client-side error boundary. Catches render errors in wallet
 * and contract-interaction subtrees and renders a graceful
 * fallback (per spec §11). The boundary re-mounts its children
 * when the user clicks "Try again".
 *
 * Note: 3rd-party libraries (e.g. the Stellar Wallets Kit) can
 * throw plain objects like `{ code: -3, message: '...' }` during
 * re-render in edge cases. We normalise those into a real `Error`
 * here so the fallback still renders cleanly and React doesn't
 * log a confusing `{}` to the console.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    if (error instanceof Error) return { error };
    if (typeof error === "string") return { error: new Error(error) };
    if (error && typeof error === "object") {
      const e = error as { message?: unknown; code?: unknown };
      const message =
        typeof e.message === "string"
          ? e.message
          : `Unexpected error (${JSON.stringify(error)})`;
      const wrapped = new Error(message);
      // Preserve `code` if present so the fallback can inspect it.
      (wrapped as Error & { code?: unknown }).code = e.code;
      return { error: wrapped };
    }
    return { error: new Error("Unknown error") };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.warn(
      "[BidChain] UI error boundary caught:",
      error.message,
      info.componentStack ?? "",
    );
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="banner warning" role="alert">
          <strong>Something went wrong.</strong>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
            {this.state.error.message}
          </div>
          <button
            className="btn btn-small"
            style={{ marginTop: 10 }}
            onClick={this.reset}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
