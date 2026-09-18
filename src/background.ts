type FetchMessage = { type: "x2i-fetch-data-url"; url: string };

chrome.runtime.onMessage.addListener((message: FetchMessage, _sender, sendResponse) => {
  if (message?.type !== "x2i-fetch-data-url" || typeof message.url !== "string") {
    return;
  }

  void (async () => {
    try {
      const response = await fetch(message.url, { credentials: "omit" });
      if (!response.ok) {
        sendResponse({ ok: false, error: `HTTP ${response.status}` });
        return;
      }
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      sendResponse({ ok: true, dataUrl });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  return true;
});

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}
