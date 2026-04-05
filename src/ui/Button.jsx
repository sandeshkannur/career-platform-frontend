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
    size === "sm" ? "var(--font-size-sm)"
    : size === "lg" ? "var(--font-size-lg)"
    : "var(--font-size-base)";
  const minHeight = size === "lg" ? 44 : undefined;

  const base = {
    fontWeight: 600,
    cursor: props.disabled ? "not-allowed" : "pointer",
    borderRadius: "var(--radius-md)",
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
    primary:   { background: hovered ? "var(--brand-hover)" : "var(--brand-primary)", color: "#fff", borderColor: "var(--brand-primary)" },
    secondary: { background: hovered ? "var(--bg-app)" : "#fff", color: "var(--text-primary)", borderColor: "var(--border)" },
    ghost:     { background: "transparent", color: "var(--text-primary)", borderColor: "transparent" },
    danger:    { background: hovered ? "#b91c1c" : "#dc2626", color: "#fff", borderColor: "#dc2626" },
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
