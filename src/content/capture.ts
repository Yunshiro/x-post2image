import { toBlob } from "html-to-image";

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number): void => {
      if (left <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(left - 1));
    };
    step(count);
  });
}

export async function capturePng(source: HTMLElement): Promise<Blob> {
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.style.position = "fixed";
  ghost.style.left = "0";
  ghost.style.top = "0";
  ghost.style.zIndex = "-1";
  ghost.style.transform = "none";
  ghost.style.pointerEvents = "none";
  document.body.append(ghost);
  await waitFrames(2);
  try {
    const blob = await toBlob(ghost, {
      pixelRatio: 2,
      cacheBust: false,
      backgroundColor: getComputedStyle(source).backgroundColor || undefined,
    });
    if (!blob) {
      throw new Error("empty capture");
    }
    return blob;
  } finally {
    ghost.remove();
  }
}

export async function copyPng(blob: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export function downloadPng(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
