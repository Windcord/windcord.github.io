import { useEffect, useMemo, useState } from "react";
import { Globe, Play } from "lucide-react";
import { api } from "../lib/api";
import type { LinkEmbed } from "../types";

const DEFAULT_ACCENT = "#4f545c";
const YOUTUBE_ACCENT = "#ff3b30";
const EMBED_CACHE_VERSION = "v2";
const embedCache = new Map<string, LinkEmbed | null>();
const youtubePlayingUrls = new Set<string>();

type Props = {
  url: string;
};

const clampStyle = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden"
};

type YouTubeEmbedConfig = {
  videoId: string;
  watchUrl: string;
  thumbnailUrl: string;
  embedUrl: string;
};

type YouTubeOEmbedPayload = {
  title?: string;
  author_name?: string;
  provider_name?: string;
  thumbnail_url?: string;
};

const parseYouTubeTimestamp = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  const match = normalized.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  const total = hours * 3600 + minutes * 60 + seconds;
  return Number.isFinite(total) && total > 0 ? total : null;
};

const parseYouTubeEmbed = (rawUrl: string): YouTubeEmbedConfig | null => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const segments = parsed.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = segments[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (segments[0] === "watch") {
      videoId = parsed.searchParams.get("v");
    } else if (segments[0] === "shorts" || segments[0] === "live" || segments[0] === "embed") {
      videoId = segments[1] ?? null;
    }
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return null;
  }

  const startRaw =
    parsed.searchParams.get("start") ??
    parsed.searchParams.get("t") ??
    parsed.searchParams.get("time_continue");
  const startSeconds = parseYouTubeTimestamp(startRaw);
  const embedParams = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    controls: "1"
  });
  if (startSeconds) {
    embedParams.set("start", String(startSeconds));
  }
  if (typeof window !== "undefined") {
    embedParams.set("origin", window.location.origin);
  }

  const canonicalWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return {
    videoId,
    watchUrl: canonicalWatchUrl,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${videoId}?${embedParams.toString()}`
  };
};

const OpenGraphEmbed = ({ url }: Props): JSX.Element | null => {
  const youtubeEmbed = useMemo(() => parseYouTubeEmbed(url), [url]);
  const cacheKey = `${EMBED_CACHE_VERSION}:${url}`;
  const [embed, setEmbed] = useState<LinkEmbed | null>(() => embedCache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(() => !embedCache.has(cacheKey));
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(() => youtubePlayingUrls.has(url));
  const [youtubeFallbackEmbed, setYouTubeFallbackEmbed] = useState<LinkEmbed | null>(null);

  useEffect(() => {
    setIsYouTubePlaying(youtubePlayingUrls.has(url));
    setYouTubeFallbackEmbed(null);
  }, [url]);

  useEffect(() => {
    const cached = embedCache.get(cacheKey);
    if (cached !== undefined) {
      setEmbed(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void api
      .get("/embeds", { params: { url } })
      .then(({ data }) => {
        const nextEmbed = (data.embed as LinkEmbed | null) ?? null;
        embedCache.set(cacheKey, nextEmbed);
        if (!cancelled) {
          setEmbed(nextEmbed);
          setLoading(false);
        }
      })
      .catch(() => {
        embedCache.set(cacheKey, null);
        if (!cancelled) {
          setEmbed(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, url]);

  useEffect(() => {
    if (!youtubeEmbed) {
      return;
    }
    if (embed?.authorName && embed?.title) {
      return;
    }

    let cancelled = false;
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeEmbed.watchUrl)}&format=json`;

    void fetch(oEmbedUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load YouTube metadata");
        }
        const payload = (await response.json()) as YouTubeOEmbedPayload;
        const nextEmbed: LinkEmbed = {
          url,
          resolvedUrl: youtubeEmbed.watchUrl,
          providerHost: "youtube.com",
          siteName: payload.provider_name?.trim() || "YouTube",
          authorName: payload.author_name?.trim() || null,
          title: payload.title?.trim() || null,
          description: null,
          imageUrl: payload.thumbnail_url?.trim() || youtubeEmbed.thumbnailUrl,
          faviconUrl: "https://www.youtube.com/favicon.ico",
          color: YOUTUBE_ACCENT
        };
        if (!cancelled) {
          setYouTubeFallbackEmbed(nextEmbed);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setYouTubeFallbackEmbed(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [embed?.authorName, embed?.title, url, youtubeEmbed]);

  if (loading) {
    return (
      <div
        className="wc-surface-card mt-2 h-[144px] w-full max-w-[560px] animate-pulse rounded-[22px]"
        style={{
          background: "linear-gradient(180deg, color-mix(in srgb, var(--wc-surface-tint) 68%, transparent), transparent 5rem), var(--wc-card-surface)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)"
        }}
      />
    );
  }

  if (youtubeEmbed) {
    const resolvedEmbed = embed?.authorName || embed?.title ? embed : youtubeFallbackEmbed;
    const channelName = resolvedEmbed?.authorName || resolvedEmbed?.siteName || "YouTube";
    const videoTitle = resolvedEmbed?.title || "Open this video on YouTube";
    const siteLabel = resolvedEmbed?.siteName || "YouTube";
    const imageUrl = resolvedEmbed?.imageUrl || youtubeEmbed.thumbnailUrl;
    const faviconUrl = resolvedEmbed?.faviconUrl;
    const startPlaying = (): void => {
      youtubePlayingUrls.add(url);
      setIsYouTubePlaying(true);
    };

    return (
      <div
        className="wc-surface-card-strong mt-2 w-full max-w-[560px] overflow-hidden rounded-[10px]"
        style={{
          background: "linear-gradient(180deg, color-mix(in srgb, var(--wc-surface-tint) 56%, transparent), transparent 5rem), var(--wc-card-surface-strong)",
          boxShadow: "0 18px 38px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.03)"
        }}
      >
        <div className="flex min-h-[148px]">
          <div className="w-1 shrink-0" style={{ backgroundColor: YOUTUBE_ACCENT }} />
          <div className="min-w-0 flex-1 p-3">
            <div className="flex items-center gap-2 text-xs text-discord-muted">
              {faviconUrl ? (
                <img src={faviconUrl} alt="" className="h-4 w-4 rounded-sm object-cover" loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <span
                  className="grid h-4 w-4 place-items-center rounded-sm"
                  style={{ background: "color-mix(in srgb, var(--wc-surface-tint-strong) 72%, transparent)", color: "#ffffffcc" }}
                >
                  <Globe size={11} />
                </span>
              )}
              <span className="truncate">{siteLabel}</span>
            </div>
            <p className="mt-2 text-base font-semibold leading-5 text-white">{channelName}</p>
            <a
              href={resolvedEmbed?.resolvedUrl || youtubeEmbed.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-[15px] leading-7 text-[var(--wc-link)] no-underline hover:underline"
              style={{ ...clampStyle, WebkitLineClamp: 2 }}
            >
              {videoTitle}
            </a>
            <div className="mt-3 overflow-hidden rounded-[6px] border border-white/[0.06] bg-black/40">
              {isYouTubePlaying ? (
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={youtubeEmbed.embedUrl}
                    title={videoTitle}
                    className="h-full w-full"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : imageUrl ? (
                <button
                  type="button"
                  className="group relative block aspect-video w-full overflow-hidden bg-black/50 text-left"
                  onClick={startPlaying}
                  aria-label={`Play ${videoTitle}`}
                >
                  <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.01]" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/32 via-transparent to-transparent" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.3)] transition group-hover:scale-[1.03] group-hover:bg-black/62">
                      <Play size={24} className="ml-1" fill="currentColor" />
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  className="group flex aspect-video w-full items-center justify-center bg-black/60 text-white"
                  onClick={startPlaying}
                  aria-label={`Play ${videoTitle}`}
                >
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/55 shadow-[0_10px_24px_rgba(0,0,0,0.3)] transition group-hover:scale-[1.03] group-hover:bg-black/62">
                    <Play size={24} className="ml-1" fill="currentColor" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!embed) {
    return null;
  }

  const accentColor = embed.color || DEFAULT_ACCENT;
  const title = embed.title || embed.siteName || embed.providerHost;
  const siteLabel = embed.siteName || embed.providerHost;

  return (
    <a
      href={embed.resolvedUrl}
      target="_blank"
      rel="noreferrer"
      className="wc-surface-card-strong mt-2 block w-full max-w-[560px] overflow-hidden rounded-[22px] no-underline"
      style={{
        background: "linear-gradient(180deg, color-mix(in srgb, var(--wc-surface-tint) 72%, transparent), transparent 5rem), var(--wc-card-surface-strong)",
        boxShadow: "0 20px 44px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.03)"
      }}
    >
      <div className="flex min-h-[148px] flex-col sm:flex-row">
        <div className="h-1.5 w-full shrink-0 sm:h-auto sm:w-1.5" style={{ backgroundColor: accentColor }} />
        <div className="min-w-0 flex-1 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-discord-muted">
                {embed.faviconUrl ? (
                  <img src={embed.faviconUrl} alt="" className="h-4 w-4 rounded-sm object-cover" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <span
                    className="grid h-6 w-6 place-items-center rounded-xl border border-white/[0.06]"
                    style={{
                      background: "color-mix(in srgb, var(--wc-surface-tint-strong) 72%, transparent)",
                      color: "color-mix(in srgb, var(--wc-link) 48%, #dbe4ff 52%)"
                    }}
                  >
                    <Globe size={12} />
                  </span>
                )}
                <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-discord-muted">{siteLabel}</span>
              </div>
              <p className="mt-2 text-[17px] font-semibold leading-6 text-white">{title}</p>
              {embed.description ? (
                <p className="mt-1.5 text-sm leading-5 text-discord-text" style={{ ...clampStyle, WebkitLineClamp: 3 }}>
                  {embed.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-discord-muted">
                <span
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.06] px-2.5 py-1"
                  style={{ background: "color-mix(in srgb, var(--wc-surface-tint-strong) 68%, transparent)" }}
                >
                  <span className="truncate">{embed.providerHost}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        {embed.imageUrl ? (
          <div className="w-full shrink-0 border-t border-white/[0.05] p-2 sm:w-[176px] sm:border-l sm:border-t-0">
            <div
              className="h-full min-h-[132px] overflow-hidden rounded-[18px]"
              style={{ background: "color-mix(in srgb, var(--wc-card-surface-strong) 82%, black 18%)" }}
            >
              <img src={embed.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          </div>
        ) : null}
      </div>
    </a>
  );
};

export default OpenGraphEmbed;