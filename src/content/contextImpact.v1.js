// frontend/src/content/contextImpact.v1.js
// v1: Deterministic, non-judgmental, student-safe explanation copy.
// Future: add locale/ageBand variants without touching UI components.

function norm(x) {
  return (x ?? "unknown").toString().trim().toLowerCase();
}

export function getContextImpactCopyV1({ ctx, locale = "en-IN", ageBand = "8-10" } = {}) {
  // Keep signature stable even if we don't use locale/ageBand yet.
  const ses = norm(ctx?.ses_band);
  const board = norm(ctx?.education_board);
  const support = norm(ctx?.support_level);
  const access = norm(ctx?.resource_access);

  const unknownAll = [ses, board, support, access].every((x) => !x || x === "unknown");

  // Base copy (always safe, globally understandable)
  const base = {
    title: "How this changes recommendations",
    intro_unknown:
      "If you share a few optional details, we adjust assumptions to be fairer. This never judges you.",
    intro_known:
      "These details help us adjust assumptions to fit your learning environment. This never judges you.",
    bullets_unknown: [
      "Access to resources can change whether we suggest more self-learning or more guided learning paths.",
      "Support level can influence how structured the suggested learning routes are.",
      "Education board helps us align examples and expectations (without rating performance).",
    ],
    footer: "You can update this anytime from Context.",
  };

  if (unknownAll) {
    return {
      title: base.title,
      intro: base.intro_unknown,
      bullets: base.bullets_unknown,
      footer: base.footer,
    };
  }

  const bullets = [];

  // Resource access: avoid “good/bad” framing; keep neutral
  if (access !== "unknown") {
    if (["good", "high", "strong"].includes(access)) {
      bullets.push(
        "With better access to learning resources, we can include more self-practice and exploration in suggested paths."
      );
    } else if (["limited", "low", "poor"].includes(access)) {
      bullets.push(
        "If learning resources are limited, we include more guided and offline-friendly practice options."
      );
    } else {
      bullets.push("Resource access helps us choose recommendations that fit your learning environment.");
    }
  }

  // Support level
  if (support !== "unknown") {
    if (["high", "strong"].includes(support)) {
      bullets.push("With stronger support, we can suggest slightly faster learning routes while keeping options flexible.");
    } else if (["low", "limited"].includes(support)) {
      bullets.push("With limited support, we prefer routes that are easier to follow independently.");
    } else {
      bullets.push("Support level helps us decide how structured the suggested learning routes should be.");
    }
  }

  // Education board
  if (board !== "unknown") {
    bullets.push("Education board helps us align examples and expectations, without judging performance.");
  }

  // SES band: extra careful
  if (ses !== "unknown") {
    bullets.push("These details are used only to avoid unfair assumptions. They never reduce your opportunities.");
  }

  return {
    title: base.title,
    intro: base.intro_known,
    bullets: bullets.slice(0, 5),
    footer: base.footer,
  };
}
    