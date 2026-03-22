export default function Page({ children, maxWidth = 960 }) {
  return (
    <div style={{
      minHeight: "100vh",
      padding: "var(--space-8) var(--space-4)",
      display: "flex",
      justifyContent: "center",
      background: "var(--bg-app)",
    }}>
      <div style={{ width: "100%", maxWidth }}>{children}</div>
    </div>
  );
}
