// src/ui/Card.jsx
export default function Card({ children, className = "" }) {
  return (
    <div
      className={["rounded-xl p-6 shadow-sm", className].join(" ")}
      style={{
        border: "1px solid var(--color-border, #6B7280)",
        background: "var(--color-surface, #FFFFFF)",
      }}
    >
      {children}
    </div>
  );
}
