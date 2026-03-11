import { useContent } from "../../locales/LanguageProvider";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";

export default function StudentCareerDetailPage() {
  const { t } = useContent();

  return (
    <SkeletonPage
      title={t("student.careerDetail.title", "Career Details")}
      subtitle={t("student.careerDetail.subtitle", "Why this career matches your profile.")}
      actions={
        <>
          <Button variant="secondary">{t("student.careerDetail.actions.back", "Back")}</Button>
          <Button>{t("student.careerDetail.actions.shortlist", "Shortlist")}</Button>
        </>
      }
    >
      <p>{t("student.careerDetail.description", "Career explanation, pathway, feasibility, CPS fit.")}</p>
    </SkeletonPage>
  );
}
