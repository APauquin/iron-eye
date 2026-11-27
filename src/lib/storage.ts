const HEIGHT_KEY = "iron-eye:height-cm";

/** The lifter's height is remembered in this browser only. Storage can be unavailable, so never throw. */
export function loadHeightCm(): number | null {
  try {
    const value = Number(localStorage.getItem(HEIGHT_KEY));
    return Number.isFinite(value) && value >= 100 && value <= 250 ? value : null;
  } catch {
    return null;
  }
}

export function saveHeightCm(value: number | null): void {
  try {
    if (value === null) localStorage.removeItem(HEIGHT_KEY);
    else localStorage.setItem(HEIGHT_KEY, String(value));
  } catch {
    // Not critical: the user just re-enters it next time.
  }
}
