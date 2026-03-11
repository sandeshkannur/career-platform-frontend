import { Link } from "react-router-dom";
import { useContent } from "../locales/LanguageProvider";
import Page from "../ui/Page";
import Card from "../ui/Card";
import PublicHeader from "../ui/PublicHeader";

export default function HomePage() {
  const { t } = useContent();

  return (
    <Page>
      <PublicHeader />
      <Card>
        <h1>{t("home.title", "Home")}</h1>
        <p>{t("home.subtitle", "Public landing page")}</p>

        <div style={{ marginTop: 16 }}>
          <p>
            <Link to="/pricing">{t("home.actions.viewPricing", "View Pricing")}</Link>
          </p>
        </div>
      </Card>
    </Page>
  );
}
