interface ToastController {
  show: (message: string) => void;
}

export const createToastController = (selector = "[data-toast]"): ToastController => {
  const element = document.querySelector<HTMLElement>(selector);
  let timeout: number | undefined;

  if (!element) {
    return {
      show: () => {}
    };
  }

  element.dataset.state = "hidden";

  const show = (message: string) => {
    if (!element) return;
    element.textContent = message;
    element.dataset.state = "visible";
    if (timeout) window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      element.dataset.state = "hidden";
    }, 2200);
  };

  return { show };
};
