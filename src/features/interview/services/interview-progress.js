function normalizeEstimatedCompleteness(history, rawCompleteness, isCompleted) {
  const userMessageCount = history.filter(
    (message) => message.role === "user",
  ).length;
  const derivedCompleteness = Math.min(
    100,
    Math.max(20, 20 + userMessageCount * 15),
  );

  const parsedCompleteness =
    typeof rawCompleteness === "number" && Number.isFinite(rawCompleteness)
      ? Math.min(100, Math.max(0, rawCompleteness))
      : derivedCompleteness;

  return isCompleted ? 100 : Math.max(parsedCompleteness, derivedCompleteness);
}

module.exports = {
  normalizeEstimatedCompleteness,
};
