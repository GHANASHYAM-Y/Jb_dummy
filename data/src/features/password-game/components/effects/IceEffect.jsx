import "../../styles/IceEffect.css";

export default function IceEffect({ password, phase, targetIndex, remainingMs }) {
  if (["idle", "armed", "cleared", "ended"].includes(phase)) return null;

  if (phase === "shattered") {
    return <div className="ice-shattered" role="status">❄️ The ice shatters.</div>;
  }

  if (phase === "breaking") {
    return <div className="ice-breaking" role="status">❄️ Ice breaks — another target is forming…</div>;
  }

  const characters = Array.from(password);
  return (
    <section className="ice-event" aria-live="assertive">
      <p className="ice-alert">❄️ DELETE THE FROZEN CHARACTER</p>
      <div className="ice-password-preview" aria-label="Frozen password target preview">
        {characters.map((character, index) => (
          <span key={`${character}-${index}`} className={index === targetIndex ? "ice-target" : "ice-safe"}>{character}</span>
        ))}
        <span className="ice-marker" style={{ gridColumn: targetIndex + 1 }}>❄️</span>
      </div>
      <p className="ice-timer">{(remainingMs / 1000).toFixed(1)}s</p>
    </section>
  );
}
