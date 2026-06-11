import { getApiBaseUrl } from "./runtimeConfig";

const DEFAULT_AVATAR_URL = `${import.meta.env.BASE_URL}default-avatar.svg`;
const DELETED_AVATAR_URL = `${import.meta.env.BASE_URL}deleted-avatar.svg`;

type AvatarLike = {
  avatarUrl?: string | null;
  isDeleted?: boolean;
};

const getBackendOrigin = (): string => {
  const apiBaseUrl = getApiBaseUrl();

  if (typeof window === "undefined") {
    try {
      return new URL(apiBaseUrl, "http://localhost").origin;
    } catch {
      return "";
    }
  }

  try {
    return new URL(apiBaseUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

export const resolveMediaUrl = (value?: string | null): string | null | undefined => {
  if (!value) {
    return value;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (value.startsWith("/uploads/") || value.startsWith("uploads/")) {
    const origin = getBackendOrigin();
    const normalizedPath = value.startsWith("/") ? value : `/${value}`;
    return origin ? `${origin}${normalizedPath}` : normalizedPath;
  }

  return value;
};

export const resolveUserAvatarUrl = (user?: AvatarLike | null): string => {
  if (user?.isDeleted) {
    return DELETED_AVATAR_URL;
  }

  return resolveMediaUrl(user?.avatarUrl) || DEFAULT_AVATAR_URL;
};