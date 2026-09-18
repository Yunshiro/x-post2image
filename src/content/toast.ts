let hideTimer = 0;

export function showToast(message: string, kind: "info" | "success" | "error" = "info"): void {
  document.querySelector("[data-x2i-toast]")?.remove();
  const toast = document.createElement("div");
  toast.dataset.x2iToast = kind;
  toast.textContent = message;
  document.body.append(toast);
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => toast.remove(), 2400);
}
