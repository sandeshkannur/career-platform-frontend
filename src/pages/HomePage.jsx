import { Link } from "react-router-dom";
import Page from "../ui/Page";
import Card from "../ui/Card";
import PublicHeader from "../ui/PublicHeader";
import useContent from "../hooks/useContent";

export default function HomePage() {
  const { t } = useContent("dashboard");

  return (
    <Page>
      <PublicHeader />
      <Card>
        <h1>{t("welcome", "Home")}</h1>
        <p>{t("landing", "Public landing page")}</p>

        <div style={{ marginTop: 16 }}>
          <p>
            <Link to="/pricing">
              {t("actions.viewPricing", "View Pricing")}
            </Link>
          </p>
        </div>
      </Card>
    </Page>
  );
}
