export default function Button({
  children, style, variant = "primary", size = "md", ...props
}) {
  const base = {
    fontWeight: 600,
    cursor: props.disabled ? "not-allowed" : "pointer",
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "opacity 0.15s",
    opacity: props.disabled ? 0.5 : 1,
    fontSize: size === "sm" ? "var(--font-size-sm)" : "var(--font-size-base)",
    padding: size === "sm" ? "6px 10px" : "10px 14px",
    fontFamily: "inherit",
  };

  const variants = {
    primary:   { background: "var(--brand-primary)", color: "#fff", borderColor: "var(--brand-primary)" },
    secondary: { background: "#fff", color: "var(--text-primary)", borderColor: "var(--border)" },
    ghost:     { background: "transparent", color: "var(--text-primary)", borderColor: "transparent" },
  };

  return (
    <button {...props} style={{ ...base, ...(variants[variant] ?? variants.primary), ...style }}>
      {children}
    </button>
  );
}
