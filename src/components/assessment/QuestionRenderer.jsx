/**
 * QuestionRenderer
 * Maps question.question_type to the correct input component.
 * ALL formats call onChoose(value) where value is a string "1"–"5"
 * matching the existing choose() contract in StudentAssessmentRunPage.
 */

import { useState } from "react";

const baseBtn =
  "w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:shadow-sm";
const activeStyle =
  "border-[var(--brand-primary)] bg-[var(--bg-app)]";
const inactiveStyle =
  "border-[var(--border)] bg-white";

function LikertQuestion({ selected, onChoose }) {
  const options = [
    { label: "Not like me at all", value: "1" },
    { label: "Not really like me", value: "2" },
    { label: "Somewhere in between", value: "3" },
    { label: "Mostly like me", value: "4" },
    { label: "Totally like me", value: "5" },
  ];
  return (
    <div className="grid gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChoose(opt.value)}
          className={[baseBtn, selected === opt.value ? activeStyle : inactiveStyle].join(" ")}
          aria-pressed={selected === opt.value}
        >
          <div className="font-medium text-[var(--text-primary)]">{opt.label}</div>
        </button>
      ))}
    </div>
  );
}

function EmojiLikertQuestion({ question, selected, onChoose }) {
  const cfg = question.renderer_config || {};
  const emojis = cfg.emojis || ["😞", "😐", "🙂", "😊", "😄"];
  const labels = cfg.labels || ["Not at all", "Not really", "Sometimes", "Often", "Always"];
  return (
    <div className="flex justify-between gap-2">
      {emojis.map((em, i) => {
        const val = String(i + 1);
        const active = selected === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChoose(val)}
            className={[
              "flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition",
              active ? activeStyle : inactiveStyle,
            ].join(" ")}
            aria-pressed={active}
          >
            <span className="text-2xl leading-none" role="img" aria-hidden="true">{em}</span>
            <span className="text-xs text-[var(--text-muted)]">{labels[i]}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScenarioQuestion({ question, selected, onChoose }) {
  const options = question.response_options || [];
  const letters = ["A", "B", "C", "D"];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt, i) => {
        const val = String(opt.score_value);
        const active = selected === val;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChoose(val)}
            className={[
              "flex items-start gap-2 rounded-xl border px-3 py-3 text-left text-sm transition hover:shadow-sm",
              active ? activeStyle : inactiveStyle,
            ].join(" ")}
            aria-pressed={active}
          >
            <span className={[
              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              active
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-[var(--bg-app)] text-[var(--text-muted)]",
            ].join(" ")}>
              {letters[i]}
            </span>
            <span className="font-medium text-[var(--text-primary)] leading-snug">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RankingQuestion({ question, onChoose }) {
  const initItems = question.response_options || [];
  const [items, setItems] = useState(initItems);
  const [dragging, setDragging] = useState(null);

  function handleDragStart(e, idx) {
    setDragging(idx);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragging === null || dragging === idx) return;
    const next = [...items];
    const [moved] = next.splice(dragging, 1);
    next.splice(idx, 0, moved);
    setItems(next);
    setDragging(null);
    onChoose(String(next[0].score_value));
  }
  function handleDragOver(e) { e.preventDefault(); }

  return (
    <div className="grid gap-2">
      <p className="text-xs text-[var(--text-muted)] mb-1">
        Drag to rank — most like you at the top
      </p>
      {items.map((opt, i) => (
        <div
          key={opt.label}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragOver={handleDragOver}
          className={[
            "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm cursor-grab transition select-none",
            dragging === i ? "opacity-40" : "opacity-100",
            i === 0 ? activeStyle : inactiveStyle,
          ].join(" ")}
        >
          <span className="text-[var(--text-muted)]">⠿</span>
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-app)] text-xs font-semibold text-[var(--text-muted)]">
            {i + 1}
          </span>
          <span className="font-medium text-[var(--text-primary)]">{opt.label}</span>
        </div>
      ))}
    </div>
  );
}

function SliderQuestion({ question, selected, onChoose }) {
  const cfg = question.renderer_config || {};
  const left   = cfg.left   || "Not at all";
  const right  = cfg.right  || "Completely";
  const emojis = cfg.emojis || ["😔", "😞", "😐", "🙂", "💪"];
  const labels = cfg.labels || ["Not at all", "A little", "Somewhat", "Quite a bit", "Completely"];

  // Track whether the user has explicitly moved the slider.
  // Until they do, we show a neutral position but do not submit an answer,
  // keeping the Next button disabled (selected stays null in the parent).
  const [touched, setTouched] = useState(false);
  const displayVal = selected ? parseInt(selected, 10) : 3;

  function handleChange(e) {
    setTouched(true);
    onChoose(String(e.target.value));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <input
        type="range"
        min="1" max="5" step="1"
        value={displayVal}
        onChange={handleChange}
        className="w-full accent-[var(--brand-primary)]"
      />
      <div className="text-center">
        {touched || selected ? (
          <>
            <span className="text-3xl leading-none" role="img" aria-hidden="true">
              {emojis[displayVal - 1]}
            </span>
            <p className="text-sm text-[var(--text-muted)] mt-1">{labels[displayVal - 1]}</p>
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Move the slider to answer</p>
        )}
      </div>
    </div>
  );
}

function ThisOrThatQuestion({ question, selected, onChoose }) {
  const options = question.response_options || [];
  const optA = options.find((o) => o.side === "a") || options[0];
  const optB = options.find((o) => o.side === "b") || options[1];
  const pair = [optA, optB].filter(Boolean);

  return (
    <div className="flex items-stretch gap-3">
      {pair.map((opt, i) => {
        const val = String(opt.score_value);
        const active = selected === val;
        return (
          <>
            {i === 1 && (
              <div key="or-divider" className="flex flex-shrink-0 items-center">
                <span className="text-xs font-medium text-[var(--text-muted)]">or</span>
              </div>
            )}
            <button
              key={val}
              type="button"
              onClick={() => onChoose(val)}
              className={[
                "flex flex-1 items-center justify-center rounded-xl border px-4 py-5 text-center text-sm font-medium transition hover:shadow-sm",
                active ? activeStyle : inactiveStyle,
              ].join(" ")}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          </>
        );
      })}
    </div>
  );
}

const RENDERERS = {
  likert:       LikertQuestion,
  emoji_likert: EmojiLikertQuestion,
  scenario:     ScenarioQuestion,
  ranking:      RankingQuestion,
  slider:       SliderQuestion,
  this_or_that: ThisOrThatQuestion,
};

export default function QuestionRenderer({ question, selected, onChoose }) {
  // Normalise: trim whitespace and lowercase so "EMOJI_LIKERT", "Slider", etc. all resolve correctly
  const raw = question?.question_type ?? question?.type ?? "";
  const type = raw.trim().toLowerCase().replace(/-/g, "_") || "likert";
  const Component = RENDERERS[type] || LikertQuestion;
  return (
    <div className={`question-renderer renderer-${type}`}>
      <Component
        question={question}
        selected={selected}
        onChoose={onChoose}
      />
    </div>
  );
}
