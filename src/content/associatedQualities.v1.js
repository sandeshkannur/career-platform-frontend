/**
 * frontend/src/content/associatedQualities.v1.js
 * Versioned, student-safe "Associated qualities" (facet-like) copy.
 *
 * IMPORTANT:
 * - CMS-only for now (no backend dependency)
 * - No numbers, no weights, no scores
 * - Calm, non-repetitive language
 * - Keys can be upgraded later to real facet IDs/names
 */

export function getAssociatedQualitiesV1({ fitBandKey }) {
  // Keep it stable + simple for beta. Later we can switch this to:
  // fitBandKey + AQ/facet signals + locale packs.

  const common = [
    "Curiosity and willingness to learn",
    "Comfort with trying small experiments",
    "Steady focus when working step-by-step",
  ];

  const byBand = {
    high_potential: [
      "You tend to pick up patterns quickly",
      "You stay engaged when tasks get challenging",
      "You’re able to connect ideas across topics",
    ],
    strong: [
      "You show good consistency in how you approach tasks",
      "You can improve quickly with practice",
      "You do well with clear routines and feedback",
    ],
    promising: [
      "You show early alignment with some core qualities",
      "Exploring beginner projects can build clarity",
      "You may benefit from guided learning paths",
    ],
    developing: [
      "Some qualities are present, and can strengthen with practice",
      "Small wins can build confidence over time",
      "Structured support can help you progress steadily",
    ],
    exploring: [
      "This may be worth exploring without pressure",
      "Try short, low-stakes activities to learn what you enjoy",
      "Notice what feels energising vs draining",
    ],
  };

  const items = byBand[fitBandKey] || byBand.exploring;

  return {
    title: "Associated qualities",
    intro: "These are a few qualities that often support success in this direction.",
    items: [...items, ...common].slice(0, 6),
  };
}

