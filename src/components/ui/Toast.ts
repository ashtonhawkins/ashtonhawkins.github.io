const state: { timeout?: number } = {};

export const showToast = (message: string, duration = 2400) => {
  const host = document.querySelector<HTMLElement>("[data-toast-root]");
  if (!host) return;
  window.clearTimeout(state.timeout);
  host.textContent = message;
  host.setAttribute("data-state", "visible");
  state.timeout = window.setTimeout(() => {
    host.removeAttribute("data-state");
  }, duration);
};
