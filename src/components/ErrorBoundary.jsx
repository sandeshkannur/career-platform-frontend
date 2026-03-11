import React from "react";
import { useContent } from "../locales/LanguageProvider";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <h2>{this.props.t?.("errorBoundary.title", "Something crashed") || "Something crashed"}</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p>{this.props.t?.("errorBoundary.consoleHint", "Open DevTools Console for full stack trace.") || "Open DevTools Console for full stack trace."}</p>
          <p>
            <a href="/dev/reset">{this.props.t?.("errorBoundary.resetSession", "Reset session") || "Reset session"}</a>
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundaryWithContent(props) {
  const { t } = useContent();

  return <ErrorBoundary {...props} t={t} />;
}


export default ErrorBoundaryWithContent;

