// Shared per-class palette so the uploader row swatches, Feature Space
// scatter, and Where It Lands mirror all use identical colors.
const CLASS_COLORS = ['#3b82f6', '#e11d8f', '#22c55e', '#f97316', '#a855f7', '#14b8a6', '#eab308', '#ef4444'];

export function classColor(classIndex) {
  return CLASS_COLORS[classIndex % CLASS_COLORS.length];
}
