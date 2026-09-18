export type ThemeName = "light" | "dim" | "dark";

function parseRgb(color: string): { r: number; g: number; b: number } | null {
  const match = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!match) {
    return null;
  }
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

export function detectTheme(root: HTMLElement = document.body): ThemeName {
  const rgb = parseRgb(getComputedStyle(root).backgroundColor);
  if (!rgb) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  if (luminance > 0.7) {
    return "light";
  }
  if (luminance > 0.12) {
    return "dim";
  }
  return "dark";
}

export function surfaceColor(element: HTMLElement): string {
  const color = getComputedStyle(element).backgroundColor;
  if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
    return color;
  }
  return getComputedStyle(document.body).backgroundColor || "#000";
}
