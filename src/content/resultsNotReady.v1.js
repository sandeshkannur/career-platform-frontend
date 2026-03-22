// Versioned content block for "Results not ready" UX.
// NON-NEGOTIABLE: UI renders blocks; copy is not hardcoded in components.

export function getResultsNotReadyV1(t) {
  const s = t || ((key, fallback) => fallback);

  return {
    version: "v1",
    blocks: [
      {
        type: "hero",
        title: s("resultsNotReady.hero.title", "Your results aren't ready yet"),
        body: s("resultsNotReady.hero.body", "That's normal if the assessment hasn't been submitted yet, or if the connection dropped before completion."),
        tone: "neutral",
      },
      {
        type: "info_list",
        title: s("resultsNotReady.infoList.title", "What you can do next"),
        items: [
          s("resultsNotReady.infoList.item1", "Resume where you left off (if an assessment is still active)."),
          s("resultsNotReady.infoList.item2", "Or start a fresh attempt if you want to answer again calmly."),
        ],
        tone: "neutral",
      },
      {
        type: "cta_row",
        primaryCta: {
          label: s("resultsNotReady.cta.assessment", "Go to assessment"),
          to: "/student/assessment",
        },
        secondaryCta: {
          label: s("resultsNotReady.cta.dashboard", "Go to dashboard"),
          to: "/student/dashboard",
        },
        note: s("resultsNotReady.cta.note", "No pressure — take your time. Your answers are used only to generate explainable guidance."),
      },
    ],
  };
}

export default getResultsNotReadyV1;

