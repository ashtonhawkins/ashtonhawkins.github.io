export type ConfidentialMode = "confidential" | "public";

const STORAGE_KEY = "resume_confidential";

export const getStoredConfidential = (): ConfidentialMode | null => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "public" ? "public" : raw === "confidential" ? "confidential" : null;
};

export const setStoredConfidential = (mode: ConfidentialMode) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, mode);
};

export const resolveInitialConfidential = (search: string): ConfidentialMode => {
  const params = new URLSearchParams(search);
  const urlMode = params.get("mode");
  if (urlMode === "public" || urlMode === "confidential") {
    if (typeof localStorage !== "undefined") {
      setStoredConfidential(urlMode);
    }
    return urlMode;
  }
  const stored = getStoredConfidential();
  if (stored) return stored;
  return "confidential";
};

export const applyHtmlConfidential = (mode: ConfidentialMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.confidential = mode;
};

export const toggleConfidential = (current: ConfidentialMode): ConfidentialMode =>
  current === "confidential" ? "public" : "confidential";

export const STORAGE = STORAGE_KEY;
