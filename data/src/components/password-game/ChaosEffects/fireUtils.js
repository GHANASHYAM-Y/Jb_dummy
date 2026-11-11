export function createInitialBurningPositions(passwordLength) {
  if (passwordLength === 0) return [];

  const size = Math.min(2, passwordLength);
  const start = Math.max(0, Math.floor(passwordLength / 2) - 1);

  return Array.from({ length: size }, (_, index) => start + index);
}

export function spreadFire(positions, passwordLength) {
  if (positions.length === 0 || passwordLength === 0) return positions;

  const burning = new Set(positions);
  const first = Math.min(...positions);
  const last = Math.max(...positions);
  const left = first - 1;
  const right = last + 1;

  // Alternating sides creates a visible, gradual burn rather than consuming
  // two characters on every tick.
  const nextPosition = positions.length % 2 === 0 ? right : left;
  const fallbackPosition = nextPosition === right ? left : right;
  const position = nextPosition >= 0 && nextPosition < passwordLength
    ? nextPosition
    : fallbackPosition;

  if (position >= 0 && position < passwordLength) burning.add(position);
  return [...burning].sort((a, b) => a - b);
}

export function reconcileBurningPositions(previousValue, nextValue, positions) {
  const previousCharacters = Array.from(previousValue);
  const nextCharacters = Array.from(nextValue);
  let prefixLength = 0;
  while (
    prefixLength < previousCharacters.length &&
    prefixLength < nextCharacters.length &&
    previousCharacters[prefixLength] === nextCharacters[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < previousCharacters.length - prefixLength &&
    suffixLength < nextCharacters.length - prefixLength &&
    previousCharacters[previousCharacters.length - 1 - suffixLength] ===
      nextCharacters[nextCharacters.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const previousChangeEnd = previousCharacters.length - suffixLength;
  const shift = nextCharacters.length - previousCharacters.length;

  return positions
    .flatMap((position) => {
      if (position < prefixLength) return [position];
      if (position >= previousChangeEnd) return [position + shift];
      return [];
    })
    .filter((position) => position >= 0 && position < nextCharacters.length);
}

export function reconcileTargetPosition(previousValue, nextValue, targetIndex, edit) {
  if (edit?.value !== previousValue) {
    return reconcileBurningPositions(previousValue, nextValue, [targetIndex])[0] ?? null;
  }

  const previousCharacters = Array.from(previousValue);
  const nextCharacters = Array.from(nextValue);
  let start = Array.from(previousValue.slice(0, edit.selectionStart)).length;
  let end = Array.from(previousValue.slice(0, edit.selectionEnd)).length;

  if (start === end && edit.inputType === "deleteContentBackward") {
    start = Math.max(0, start - 1);
  } else if (start === end && edit.inputType === "deleteContentForward") {
    end = Math.min(previousCharacters.length, end + 1);
  }

  if (targetIndex < start) return targetIndex;
  if (targetIndex >= end) return targetIndex + nextCharacters.length - previousCharacters.length;
  return null;
}
