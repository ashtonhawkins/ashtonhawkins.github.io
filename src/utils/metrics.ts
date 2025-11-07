export const meetsEvidenceThreshold = (sample?: number, confidence?: string) => {
  if (typeof sample === "number" && sample >= 1000) return true;
  if (confidence && confidence.trim().length > 0) return true;
  return false;
};
