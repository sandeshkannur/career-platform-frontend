// src/pages/HomePage.jsx
// Full public landing page for mapyourcareer.in
//
// HOW IT FITS THE CODEBASE:
// - useContent() / t() for all text (en + kn via LanguageProvider)
// - PublicHeader unchanged (keeps LanguageSwitcher, useContent, NavLink)
// - No <Page> or <Card> wrapper — this is a full-bleed layout
// - Escapes #root max-width + padding via `margin: 0 -16px`
// - Pure inline styles + existing CSS variables — no new dependencies
// - All string keys follow LOCALE_GUIDE naming convention

import { Link } from "react-router-dom";
import { useContent } from "../locales/LanguageProvider";
import PublicHeader from "../ui/PublicHeader";

/* ─── tiny reusables ──────────────────────────────────────────────────── */

function StatPill({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 30, fontWeight: 800, color: "var(--brand-primary)" }}>{value}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.35 }}>{label}</span>
    </div>
  );
}

function StepCard({ number, title, desc }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid var(--border)",
      borderRadius: 16, padding: "20px 20px",
      display: "flex", gap: 14, alignItems: "flex-start",
    }}>
      <div style={{
        flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
        background: "var(--brand-primary)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 14,
      }}>{number}</div>
      <div>
        <div style={{ fontWeight: 700, color: "var(--brand-primary)", marginBottom: 6, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>{desc}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid var(--border)",
      borderRadius: 16, padding: "20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: "var(--brand-primary)", marginBottom: 6, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

function QuoteCard({ quote, name, role }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid var(--border)",
      borderRadius: 16, padding: "20px",
    }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 14px" }}>"{quote}"</p>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--brand-primary)" }}>{name}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{role}</div>
    </div>
  );
}

function Section({ children, bg = "transparent", py = 48 }) {
  return (
    <div style={{ background: bg }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: `${py}px 20px` }}>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--brand-primary)", margin: "0 0 8px" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

function AutoGrid({ children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 16,
    }}>
      {children}
    </div>
  );
}

function PrimaryBtn({ to, children }) {
  return (
    <Link to={to} style={{
      textDecoration: "none",
      background: "var(--brand-primary)", color: "#fff",
      borderRadius: 12, padding: "11px 26px",
      fontSize: 14, fontWeight: 700, display: "inline-block",
    }}>{children}</Link>
  );
}

function SecondaryBtn({ to, children }) {
  return (
    <Link to={to} style={{
      textDecoration: "none",
      background: "#fff", color: "var(--brand-primary)",
      border: "1px solid var(--border)",
      borderRadius: 12, padding: "11px 26px",
      fontSize: 14, fontWeight: 600, display: "inline-block",
    }}>{children}</Link>
  );
}

/* ─── main ────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { t } = useContent();

  const clusters = [
    t("home.clusters.agriculture", "Agriculture & Natural Resources"),
    t("home.clusters.architecture", "Architecture & Construction"),
    t("home.clusters.arts", "Arts & Communications"),
    t("home.clusters.business", "Business & Administration"),
    t("home.clusters.education", "Education & Training"),
    t("home.clusters.finance", "Finance"),
    t("home.clusters.government", "Government & Public Administration"),
    t("home.clusters.health", "Health Science"),
    t("home.clusters.hospitality", "Hospitality & Tourism"),
    t("home.clusters.humanServices", "Human Services"),
    t("home.clusters.it", "Information Technology"),
    t("home.clusters.law", "Law & Public Safety"),
    t("home.clusters.manufacturing", "Manufacturing"),
    t("home.clusters.marketing", "Marketing & Sales"),
    t("home.clusters.stem", "STEM"),
    t("home.clusters.transport", "Transportation & Logistics"),
  ];

  return (
    // Escape #root's max-width: 1200px and padding: 16px / 24px
    <div style={{ margin: "0 -16px" }}>
      <PublicHeader />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <Section bg="var(--bg-app)" py={56}>
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto" }}>

          {/* eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", border: "1px solid var(--border)",
            borderRadius: 999, padding: "6px 16px",
            fontSize: 12, color: "var(--text-muted)", marginBottom: 24,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            {t("home.hero.eyebrow", "Now live · India's first AQ-based career assessment")}
          </div>

          <h1 style={{
            fontSize: "clamp(26px, 5vw, 42px)",
            fontWeight: 800, color: "var(--brand-primary)",
            lineHeight: 1.15, letterSpacing: "-0.4px",
            margin: "0 0 18px",
          }}>
            {t("home.hero.headline", "Discover the career you were built for")}
          </h1>

          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 30px" }}>
            {t("home.hero.subtitle", "MapYourCareer uses 25 Associated Qualities to build your unique talent fingerprint — then maps it to 335 careers across 15 industry clusters. Science-backed. Counsellor-verified.")}
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
            <PrimaryBtn to="/signup">{t("home.hero.cta.start", "Start Free Assessment →")}</PrimaryBtn>
            <SecondaryBtn to="/pricing">{t("home.hero.cta.pricing", "View Pricing")}</SecondaryBtn>
          </div>

          {/* stat pills */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16,
            background: "#fff", border: "1px solid var(--border)",
            borderRadius: 16, padding: "20px 16px",
            maxWidth: 400, margin: "0 auto",
          }}>
            <StatPill value="50"  label={t("home.stats.questions", "curated questions")} />
            <StatPill value="335" label={t("home.stats.careers", "mapped careers")} />
            <StatPill value="25"  label={t("home.stats.qualities", "Associated Qualities")} />
          </div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <Section bg="#fff">
        <SectionHeader
          title={t("home.howItWorks.title", "How it works")}
          subtitle={t("home.howItWorks.subtitle", "Three steps. Twenty minutes. A lifetime of clarity.")}
        />
        <AutoGrid>
          <StepCard number="1"
            title={t("home.howItWorks.step1.title", "Take the assessment")}
            desc={t("home.howItWorks.step1.desc", "50 carefully crafted questions measuring your 25 Associated Qualities — curiosity, analytical thinking, empathy, grit, and more.")}
          />
          <StepCard number="2"
            title={t("home.howItWorks.step2.title", "Get your AQ profile")}
            desc={t("home.howItWorks.step2.desc", "Your unique talent fingerprint across 25 dimensions. Explainable, science-backed, and never just a label or score.")}
          />
          <StepCard number="3"
            title={t("home.howItWorks.step3.title", "Discover your careers")}
            desc={t("home.howItWorks.step3.desc", "Your profile is matched to 335 careers across 15 clusters. See what fits, what gaps exist, and what to do next.")}
          />
        </AutoGrid>
      </Section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <Section bg="var(--bg-app)">
        <SectionHeader
          title={t("home.features.title", "Built differently")}
          subtitle={t("home.features.subtitle", "Not a quiz. Not a personality type. A real assessment engine.")}
        />
        <AutoGrid>
          <FeatureCard icon="🧠"
            title={t("home.features.aq.title", "25 Associated Qualities")}
            desc={t("home.features.aq.desc", "From curiosity and analytical decomposition to stress tolerance and integrity — we measure what drives career success.")}
          />
          <FeatureCard icon="🎯"
            title={t("home.features.careers.title", "335 careers, 15 clusters")}
            desc={t("home.features.careers.desc", "Agriculture to STEM, Health Science to Creative Arts — every major Indian and global career path is mapped.")}
          />
          <FeatureCard icon="🔍"
            title={t("home.features.explainable.title", "Explainable results")}
            desc={t("home.features.explainable.desc", "Every recommendation comes with a clear reason. No black box. Your counsellor can read and act on it.")}
          />
          <FeatureCard icon="🌐"
            title={t("home.features.multilingual.title", "Multilingual")}
            desc={t("home.features.multilingual.desc", "Questions available in English and Kannada. More languages coming soon.")}
          />
          <FeatureCard icon="👨‍🏫"
            title={t("home.features.counsellor.title", "Counsellor tools")}
            desc={t("home.features.counsellor.desc", "Forward and reverse career engines let counsellors run live gap analysis during student sessions.")}
          />
          <FeatureCard icon="🔒"
            title={t("home.features.safe.title", "Safe for minors")}
            desc={t("home.features.safe.desc", "Guardian consent flow, privacy-first design, and student-safe output projections built in from day one.")}
          />
        </AutoGrid>
      </Section>

      {/* ── CAREER CLUSTERS ───────────────────────────────────── */}
      <Section bg="#fff">
        <SectionHeader
          title={t("home.clusters.title", "16 career clusters covered")}
          subtitle={t("home.clusters.subtitle", "Every major industry — from your first job to your calling.")}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {clusters.map((c) => (
            <span key={c} style={{
              background: "var(--bg-app)", border: "1px solid var(--border)",
              borderRadius: 999, padding: "6px 14px",
              fontSize: 12, color: "var(--text-muted)", fontWeight: 500,
            }}>{c}</span>
          ))}
        </div>
      </Section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────── */}
      <Section bg="var(--bg-app)">
        <SectionHeader title={t("home.quotes.title", "What counsellors say")} />
        <AutoGrid>
          <QuoteCard
            quote={t("home.quotes.1.text", "Finally a tool that gives me something concrete to discuss with the student, not just 'you are an INTJ'.")}
            name={t("home.quotes.1.name", "Priya Nair")}
            role={t("home.quotes.1.role", "School Counsellor, Bangalore")}
          />
          <QuoteCard
            quote={t("home.quotes.2.text", "The gap analysis between a student's current profile and their dream career is a game changer for sessions.")}
            name={t("home.quotes.2.name", "Rajesh Menon")}
            role={t("home.quotes.2.role", "Career Advisor, Chennai")}
          />
          <QuoteCard
            quote={t("home.quotes.3.text", "Our students in rural schools now get the same quality of career guidance as those in metro schools.")}
            name={t("home.quotes.3.name", "Anita Sharma")}
            role={t("home.quotes.3.role", "NGO Education Programme Lead")}
          />
        </AutoGrid>
      </Section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <Section bg="var(--brand-primary)" py={52}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 12px" }}>
            {t("home.finalCta.title", "Ready to map your career?")}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: "0 0 28px" }}>
            {t("home.finalCta.subtitle", "Free to start. Takes 20 minutes. Results that actually mean something.")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup" style={{
              textDecoration: "none", background: "#fff",
              color: "var(--brand-primary)", borderRadius: 12,
              padding: "12px 28px", fontSize: 14, fontWeight: 700,
            }}>
              {t("home.finalCta.cta.signup", "Create Free Account")}
            </Link>
            <Link to="/login" style={{
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", borderRadius: 12,
              padding: "12px 28px", fontSize: 14, fontWeight: 600,
            }}>
              {t("home.finalCta.cta.login", "Sign In")}
            </Link>
          </div>
        </div>
      </Section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderTop: "1px solid var(--border)" }}>
        <div style={{
          maxWidth: 960, margin: "0 auto", padding: "24px 20px",
          display: "flex", flexWrap: "wrap",
          alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "var(--brand-primary)" }}>
            {t("home.footer.brand", "MapYourCareer")}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { to: "/pricing", label: t("nav.pricing", "Pricing") },
              { to: "/login",   label: t("nav.login",   "Login") },
              { to: "/signup",  label: t("nav.signup",  "Signup") },
            ].map(({ to, label }) => (
              <Link key={to} to={to} style={{
                textDecoration: "none", fontSize: 13, color: "var(--text-muted)",
              }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {t("home.footer.copy", "© 2025 MapYourCareer · India")}
          </div>
        </div>
      </div>
    </div>
  );
}
