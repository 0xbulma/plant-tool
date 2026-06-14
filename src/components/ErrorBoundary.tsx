import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Évite la page blanche : capture les erreurs de rendu et affiche un repli. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur de rendu :", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="mx-auto max-w-md p-6 text-center text-sm text-destructive"
        >
          <p className="mb-3 font-semibold">Une erreur est survenue.</p>
          <p className="mb-4 text-muted-foreground">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
