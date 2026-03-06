import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import useContent from "../../hooks/useContent";

export default function StudentCareerDetailPage() {
  const { t } = useContent("student.careerDetail");

  return (
    <SkeletonPage
      title={t("title", "Career Details")}
      subtitle={t("subtitle", "Why this career matches your profile.")}
      actions={
        <>
          <Button variant="secondary">
            {t("actions.back", "Back")}
          </Button>
          <Button>
            {t("actions.shortlist", "Shortlist")}
          </Button>
        </>
      }
    >
      <p>
        {t(
          "body.placeholder",
          "Career explanation, pathway, feasibility, CPS fit."
        )}
      </p>
    </SkeletonPage>
  );
}

