// Simple, dependency-free password strength estimator.
// Returns a score 0-4 plus a label/color for UI, and a list of unmet rules.
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "lower",  label: "One lowercase letter",  test: (p) => /[a-z]/.test(p) },
  { id: "upper",  label: "One uppercase letter",  test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "One number",            test: (p) => /\d/.test(p) },
  { id: "symbol", label: "One special character",  test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordStrength(password = "") {
  if (!password) return { score: 0, label: "", color: "#475569", percent: 0, unmet: PASSWORD_RULES };

  const unmet = PASSWORD_RULES.filter(r => !r.test(password));
  const met = PASSWORD_RULES.length - unmet.length;

  // Weighted score: length matters more than variety
  let score = met;
  if (password.length >= 12) score += 1;
  score = Math.min(score, 5);

  const levels = [
    { max: 1, label: "Very weak", color: "#ef4444" },
    { max: 2, label: "Weak",      color: "#f97316" },
    { max: 3, label: "Fair",      color: "#eab308" },
    { max: 4, label: "Good",      color: "#22c55e" },
    { max: 6, label: "Strong",    color: "#06b6d4" },
  ];
  const level = levels.find(l => score <= l.max) || levels[levels.length - 1];

  return {
    score,
    label: level.label,
    color: level.color,
    percent: Math.min(100, Math.round((score / 5) * 100)),
    unmet,
  };
}

export function isPasswordAcceptable(password = "") {
  // Minimum bar to submit: length + at least 2 other rule categories
  return password.length >= 6;
}
