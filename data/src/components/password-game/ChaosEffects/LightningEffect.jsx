import "./LightningEffect.css";

export default function LightningEffect({ password, phase, targetIndex, remainingMs, strikeCount }) {
  if (["idle", "armed", "cleared", "ended"].includes(phase)) return null;

  if (phase === "waiting") {
    return <div className="lightning-waiting" role="status">⚡ Strike complete. The storm is gathering again…</div>;
  }

  const characters = Array.from(password);
  return (
    <section className="lightning-event" aria-live="assertive">
      <p className="lightning-alert">⚡ DELETE THE MARKED CHARACTER</p>
      <div className="lightning-password-preview" aria-label="Lightning target preview">
        {characters.map((character, index) => (
          <span key={`${character}-${index}`} className={index === targetIndex ? "lightning-target" : "lightning-safe"}>{character}</span>
        ))}
        <span className="lightning-bolt" style={{ gridColumn: targetIndex + 1 }}>⚡</span>
      </div>
      <p className="lightning-timer">{(remainingMs / 1000).toFixed(1)}s · strikes: {strikeCount}</p>
    </section>
  );
}
