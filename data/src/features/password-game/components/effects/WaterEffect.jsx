import "../../styles/WaterEffect.css";

export default function WaterEffect({ password, phase, sweptCount, drainCommand, onDrainChange }) {
  if (phase === "idle" || phase === "armed" || phase === "cleared") return null;

  if (phase === "failed") {
    return (
      <div className="water-failure" role="status" aria-live="assertive">
        <span aria-hidden="true">〰 〰 〰</span>
        <strong>Your word has been swept away.</strong>
      </div>
    );
  }

  const characters = Array.from(password);
  const firstSweptIndex = Math.max(0, characters.length - sweptCount);
  const isWarning = phase === "warning";

  return (
    <section className={`water-event water-${phase}`} aria-live="polite">
      <p className="water-alert">{isWarning ? "💧 ..." : "🌊 FLOODING!"}</p>
      <p className="water-objective">TYPE: <strong>DRAIN</strong></p>
      <div className="water-password-preview" aria-label="Flooding password preview">
        {characters.map((character, index) => (
          <span key={`${character}-${index}`} className={index >= firstSweptIndex ? "water-swept-character" : "water-safe-character"}>
            {index >= firstSweptIndex ? "🌊" : character}
          </span>
        ))}
      </div>
      <div className="water-wave" aria-hidden="true">~~~~~~~~~~~~</div>
      <label className="water-drain-label">
        Drain command
        <input
          className="water-drain-input"
          type="text"
          value={drainCommand}
          onChange={(event) => onDrainChange(event.target.value)}
          placeholder="Type DRAIN"
          autoComplete="off"
        />
      </label>
    </section>
  );
}
