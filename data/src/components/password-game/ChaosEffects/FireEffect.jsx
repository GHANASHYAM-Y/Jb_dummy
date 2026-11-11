import "./ChaosEffects.css";

export default function FireEffect({ flameCount, phase }) {
  if (phase === "idle") return null;

  if (phase === "completed") {
    return (
      <div className="fire-status fire-complete" role="status" aria-live="polite">
        <span className="fire-status-label">Fire chaos session complete — continue to the next password rule.</span>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <main className="fire-destruction-scene" aria-labelledby="fire-destruction-title">
        <div className="fire-smoke fire-smoke-one" aria-hidden="true" />
        <div className="fire-smoke fire-smoke-two" aria-hidden="true" />
        {Array.from({ length: 65 }, (_, index) => {
          const x = 15 + ((index * 37) % 70);
          const y = 40 + ((index * 19) % 38);
          const size = 2 + (index % 5);
          const delay = ((index * 13) % 28) / 10;

          return (
            <i
              className="fire-ash-particle"
              key={index}
              aria-hidden="true"
              style={{
                "--ash-x": `${x}%`,
                "--ash-y": `${y}%`,
                "--ash-size": `${size}px`,
                "--ash-delay": `${delay}s`,
                "--ash-duration": `${2 + (index % 4) * 0.45}s`,
              }}
            />
          );
        })}
        <div className="fire-destruction-content">
          <div className="fire-ornament" aria-hidden="true"><span>☠</span></div>
          <h1 id="fire-destruction-title">Password Destroyed</h1>
          <p className="fire-destruction-subtitle">No password survives the flames</p>
          <div className="fire-ashes" role="status" aria-live="assertive">
            <strong>Password turned into ashes</strong>
          </div>
        </div>
        <div className="fire-floor" aria-hidden="true" />
        <div className="fire-vignette" aria-hidden="true" />
      </main>
    );
  }

  return (
    <div className="fire-status" role="status" aria-live="polite">
      <span className="fire-status-label">
        {flameCount} fire {flameCount === 1 ? "emoji is" : "emojis are"} spreading — delete every 🔥 to survive.
      </span>
    </div>
  );
}
