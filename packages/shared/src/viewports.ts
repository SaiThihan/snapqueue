export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

export const DEFAULT_VIEWPORT: ViewportName = "desktop";

export function isViewportName(value: unknown): value is ViewportName {
  return typeof value === "string" && value in VIEWPORTS;
}

export const VIEWPORT_NAMES = Object.keys(VIEWPORTS) as ViewportName[];
