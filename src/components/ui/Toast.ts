export class Toast {
  private root: HTMLElement | null;
  private timeoutId: number | null = null;

  constructor(root?: HTMLElement | null) {
    this.root = root ?? document.querySelector<HTMLElement>("[data-toast-root]");
    if (this.root) {
      this.root.setAttribute("role", "status");
    }
  }

  show(message: string, duration = 2400) {
    if (!this.root) return;
    this.root.textContent = message;
    this.root.dataset.state = "visible";
    if (this.timeoutId) window.clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(() => this.hide(), duration);
  }

  hide() {
    if (!this.root) return;
    this.root.dataset.state = "hidden";
  }
}
