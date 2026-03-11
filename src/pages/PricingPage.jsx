//CareerPlatform\frontend\src\pages\PricingPage.jsx

// src/pages/PricingPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../ui/PublicHeader";
import useContent from "../hooks/useContent";

function PriceCard({
  title,
  price,
  subtitle,
  features = [],
  ctaLabel,
  ctaTo,
  highlight = false,
  recommendedLabel,
  perAssessmentLabel,
  noteText,
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-6 text-left shadow-sm",
        highlight ? "border-black" : "border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        </div>

        {highlight ? (
          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
            {recommendedLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="text-4xl font-semibold">{price}</div>
        <div className="mt-1 text-sm text-gray-600">{perAssessmentLabel}</div>
      </div>

      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-black" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link
          to={ctaTo}
          className={[
            "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium",
            highlight
              ? "bg-black text-white hover:opacity-90"
              : "bg-gray-100 text-black hover:bg-gray-200",
          ].join(" ")}
        >
          {ctaLabel}
        </Link>

        <p className="mt-3 text-xs text-gray-500">{noteText}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { t } = useContent("pricing");

  return (
    <div>
      <PublicHeader />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="text-center">
          <h1 className="text-3xl font-semibold">{t("pricing.title", "Pricing")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600">
            {t(
              "pricing.subtitle",
              "CareerPlatform offers a deterministic, explainable assessment with a Free report and an upgraded Premium report."
            )}
          </p>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <PriceCard
            title={t("pricing.free.title", "Free")}
            price={t("pricing.free.price", "₹0")}
            subtitle={t("pricing.free.subtitle", "Great for first-time exploration")}
            features={[
              t("pricing.free.features.1", "Top recommended careers (basic)"),
              t("pricing.free.features.2", "Core strengths summary"),
              t("pricing.free.features.3", "Deterministic mapping (skills → careers)"),
              t("pricing.free.features.4", "Shareable report link (UI-only for now)"),
            ]}
            ctaLabel={t("pricing.free.cta", "Start with Free")}
            ctaTo="/login"
            recommendedLabel={t("pricing.recommended", "Recommended")}
            perAssessmentLabel={t("pricing.perAssessment", "per assessment")}
            noteText={t(
              "pricing.note.noPaymentWiring",
              "No backend payment wiring in this step — CTA routes to existing flows."
            )}
          />

          <PriceCard
            title={t("pricing.premium.title", "Premium")}
            price={t("pricing.premium.price", "₹799")}
            subtitle={t("pricing.premium.subtitle", "Deeper analytics + explainability")}
            highlight
            features={[
              t("pricing.premium.features.1", "Cluster-level insights & key skill breakdown"),
              t("pricing.premium.features.2", "Explainable career fit (why these careers)"),
              t("pricing.premium.features.3", "More detailed report sections"),
              t("pricing.premium.features.4", "Designed for auditability & stability"),
            ]}
            ctaLabel={t("pricing.premium.cta", "Get Premium")}
            ctaTo="/login"
            recommendedLabel={t("pricing.recommended", "Recommended")}
            perAssessmentLabel={t("pricing.perAssessment", "per assessment")}
            noteText={t(
              "pricing.note.noPaymentWiring",
              "No backend payment wiring in this step — CTA routes to existing flows."
            )}
          />
        </section>

        <section className="mt-10 rounded-2xl border border-gray-200 p-6 text-left">
          <h2 className="text-lg font-semibold">
            {t("pricing.whatYouGet.title", "What you get")}
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium">
                {t("pricing.whatYouGet.deterministic.title", "Deterministic")}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {t(
                  "pricing.whatYouGet.deterministic.desc",
                  "Recommendations come from controlled mappings and scoring — not random outputs."
                )}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium">
                {t("pricing.whatYouGet.explainable.title", "Explainable")}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {t(
                  "pricing.whatYouGet.explainable.desc",
                  "Premium focuses on “why” — key skills and cluster drivers."
                )}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium">
                {t("pricing.whatYouGet.complianceFirst.title", "Compliance-first")}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {t(
                  "pricing.whatYouGet.complianceFirst.desc",
                  "Guardian consent gating remains enforced for minors in protected student routes."
                )}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-medium">
                {t("pricing.whatYouGet.incrementalBuild.title", "Incremental build")}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {t(
                  "pricing.whatYouGet.incrementalBuild.desc",
                  "This page is UI-only and safe to merge without backend changes."
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {t(
                "pricing.note.nextStep",
                "Next step (later): connect Premium CTA to real checkout/payment and route to premium report pages."
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
