import { useState } from "react";

export default function Button({
  children, style, variant = "primary", size = "md", ...props
}) {
  const [hovered, setHovered] = useState(false);
  const padding =
    size === "sm" ? "6px 10px"
    : size === "lg" ? "12px 20px"
    : "10px 14px";
  const fontSize =
    size === "sm" ? "var(--font-size-sm, 0.875rem)"
    : size === "lg" ? "var(--font-size-lg, 1.125rem)"
    : "var(--font-size-base, 1rem)";
  const minHeight = size === "lg" ? 44 : undefined;
  const base = {
    fontWeight: 600,
    cursor: props.disabled ? "not-allowed" : "pointer",
    borderRadius: "var(--radius-md, 10px)",
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "opacity 0.15s, background 0.1s, box-shadow 0.1s",
    opacity: props.disabled ? 0.5 : 1,
    fontSize,
    padding,
    minHeight,
    fontFamily: "inherit",
  };
  const variants = {
    primary: {
      background: hovered ? "var(--color-secondary, #6D28D9)" : "var(--color-primary, #2540D9)",
      color: "var(--color-on-fill-light, #FFFFFF)",
      borderColor: hovered ? "var(--color-secondary, #6D28D9)" : "var(--color-primary, #2540D9)",
    },
    secondary: {
      background: hovered ? "var(--color-paper, #F8FAF9)" : "var(--color-surface, #FFFFFF)",
      color: "var(--color-ink-900, #111521)",
      borderColor: "var(--color-border, #6B7280)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-ink-900, #111521)",
      borderColor: "transparent",
    },
    danger: {
      background: hovered ? "var(--color-error-ink, #C81E1E)" : "var(--color-error, #E02424)",
      color: "var(--color-on-fill-light, #FFFFFF)",
      borderColor: hovered ? "var(--color-error-ink, #C81E1E)" : "var(--color-error, #E02424)",
    },
  };
  return (
    <button
      {...props}
      style={{ ...base, ...(variants[variant] ?? variants.primary), ...style }}
      onMouseEnter={(e) => { setHovered(true); props.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); props.onMouseLeave?.(e); }}
    >
      {children}
    </button>
  );
}
