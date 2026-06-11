type DesktopBridge = {
  isDesktop?: boolean;
  apiBaseUrl?: string;
  socketUrl?: string;
};

const DEFAULT_DESKTOP_API_BASE_URL = "https://windapi.gangbeastsost.net/api";
const DEFAULT_DESKTOP_SOCKET_URL = "https://windapi.gangbeastsost.net";

const readDesktopBridge = (): DesktopBridge | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.windcordDesktop ?? null;
};

export const isDesktopApp = (): boolean => {
  return Boolean(readDesktopBridge()?.isDesktop);
};

export const getApiBaseUrl = (): string => {
  const bridge = readDesktopBridge();
  const desktopUrl = bridge?.apiBaseUrl?.trim();
  if (desktopUrl) {
    return desktopUrl;
  }

  if (bridge?.isDesktop) {
    return DEFAULT_DESKTOP_API_BASE_URL;
  }

  return import.meta.env.VITE_API_BASE_URL ?? "/api";
};

export const getSocketUrl = (): string => {
  const bridge = readDesktopBridge();
  const desktopUrl = bridge?.socketUrl?.trim();
  if (desktopUrl) {
    return desktopUrl;
  }

  if (bridge?.isDesktop) {
    return DEFAULT_DESKTOP_SOCKET_URL;
  }

  return import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";
};
