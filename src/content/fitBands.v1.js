/**
 * frontend/src/content/fitBands.v1.js
 * Versioned, student-safe fit band copy (English baseline).
 *
 * IMPORTANT:
 * - Keys are canonical + stable (do not change)
 * - Copy is calm and non-quantified (no numbers, no %)
 * - Future locales can provide alternate resolvers while keeping keys stable
 */

export function getFitBandsV1() {
  return {
    high_potential: {
      label: "High potential",
      desc: "A strong match with your current strengths.",
    },
    strong: {
      label: "Strong",
      desc: "A solid match with clear room to grow.",
    },
    promising: {
      label: "Promising",
      desc: "Good signals — exploring further can help confirm fit.",
    },
    developing: {
      label: "Developing",
      desc: "Some alignment — focused practice can strengthen fit.",
    },
    exploring: {
      label: "Exploring",
      desc: "A possible option — try small steps to learn more.",
    },
  };
}
