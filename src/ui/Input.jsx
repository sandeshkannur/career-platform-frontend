export default function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--radius-md, 10px)",
        border: "1px solid var(--color-border, #6B7280)",
        background: "var(--color-surface, #FFFFFF)",
        color: "var(--color-ink-900, #111521)",
        fontSize: "var(--font-size-base, 1rem)",
        fontFamily: "inherit",
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...style,
      }}
    />
  );
}
