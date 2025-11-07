export class ToastController {
  private node: HTMLDivElement;
  private timeout: number | null = null;

  constructor() {
    this.node = document.createElement("div");
    this.node.className = "fixed inset-x-4 bottom-6 z-[100] flex justify-center pointer-events-none";
    document.body.appendChild(this.node);
  }

  destroy() {
    if (this.node.parentElement) {
      this.node.parentElement.removeChild(this.node);
    }
  }

  show(message: string) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = "pointer-events-auto rounded-full bg-[var(--surface-alt)] px-4 py-2 text-sm text-[var(--ink)] shadow-lg shadow-black/10 ring-1 ring-[color-mix(in_srgb,var(--ink)_10%,transparent)] transition-opacity duration-200";
    this.node.replaceChildren(toast);
    if (this.timeout) {
      window.clearTimeout(this.timeout);
    }
    this.timeout = window.setTimeout(() => {
      toast.style.opacity = "0";
      window.setTimeout(() => {
        if (toast.parentElement === this.node) {
          this.node.removeChild(toast);
        }
      }, 200);
    }, 2000);
  }
}
