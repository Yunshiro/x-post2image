type FetchResult = { ok: true; dataUrl: string } | { ok: false; error?: string };

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const result = (await chrome.runtime.sendMessage({
      type: "x2i-fetch-data-url",
      url,
    })) as FetchResult | undefined;
    if (result?.ok) {
      return result.dataUrl;
    }
  } catch {
    // Extension context can be invalidated after a reload.
  }
  return null;
}

function waitForImage(img: HTMLImageElement, timeoutMs = 4000): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = (): void => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      resolve();
    };
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    window.setTimeout(done, timeoutMs);
  });
}

export async function inlineMedia(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
        return;
      }
      const dataUrl = await fetchDataUrl(src);
      if (!dataUrl) {
        return;
      }
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.src = dataUrl;
      await waitForImage(img);
    }),
  );

  const nodes = [root, ...root.querySelectorAll<HTMLElement>("*")];
  await Promise.all(
    nodes.map(async (el) => {
      const background = getComputedStyle(el).backgroundImage;
      const match = background.match(/url\(["']?(https?:[^"')]+)["']?\)/);
      if (!match) {
        return;
      }
      const dataUrl = await fetchDataUrl(match[1]);
      if (dataUrl) {
        el.style.backgroundImage = `url("${dataUrl}")`;
      }
    }),
  );

  root.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("autoplay");
    video.controls = false;
    if (!video.poster && video.currentSrc) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        video.poster = canvas.toDataURL("image/png");
      } catch {
        // Cross-origin frames stay as the native poster.
      }
    }
  });
}
