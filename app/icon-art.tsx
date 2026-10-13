/** App icon: a tennis ball on court blue (used for the browser icon and iPhone home-screen icon). */
export function IconArt({ size }: { size: number }) {
  const ball = size * 0.68;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f2f57" }}>
      <svg width={ball} height={ball} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#d9f24b" />
        <path d="M23 17 C42 34 42 66 23 83" fill="none" stroke="#f4f2ec" strokeWidth="6" strokeLinecap="round" />
        <path d="M77 17 C58 34 58 66 77 83" fill="none" stroke="#f4f2ec" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
