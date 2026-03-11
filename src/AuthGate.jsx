// src/AuthGate.jsx
import { useSession } from "./hooks/useSession";
import { useContent } from "./locales/LanguageProvider.jsx";
import LoadingScreen from "./components/LoadingScreen";
import { SessionProvider } from "./session/SessionContext";

export default function AuthGate({ children }) {
  const session = useSession();
  const { t } = useContent();

  if (session.bootstrapping) {
    return <LoadingScreen label={t("authGate.loadingSession", "Loading session…")} />;
  }

  return <SessionProvider value={session}>{children}</SessionProvider>;
}
