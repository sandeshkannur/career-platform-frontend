export default function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        fontSize: "var(--font-size-base)",
        fontFamily: "inherit",
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...style,
      }}
    />
  );
}
