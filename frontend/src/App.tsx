import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import LoginPage from "./pages/Login";
import MainPage from "./pages/App";
import JoinInvitePage from "./pages/JoinInvite";
import StatusPage from "./pages/Status";
import { useAuthStore } from "./lib/stores/authStore";
import ProtectedRoute from "./components/ProtectedRoute";

type DesktopUpdateInfo = {
  updateAvailable: boolean;
  latestVersion: string;
  localVersion: string;
  releaseUrl: string;
};

const AppRouter = (): JSX.Element => {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const loading = useAuthStore((s) => s.loading);
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdateInfo | null>(null);
  const [updateDownloadInProgress, setUpdateDownloadInProgress] = useState(false);
  const [updateDownloadPercent, setUpdateDownloadPercent] = useState(0);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!window.windcordDesktop?.isDesktop) {
      return;
    }

    const unsubscribe = window.windcordDesktop.onUpdateAvailable?.((payload) => {
      if (payload?.updateAvailable) {
        setDesktopUpdate(payload);
      }
    });

    void window.windcordDesktop.checkForUpdates?.().then((payload) => {
      if (payload?.updateAvailable) {
        setDesktopUpdate(payload);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!window.windcordDesktop?.isDesktop) {
      return;
    }

    const unsubscribe = window.windcordDesktop.onUpdateDownloadProgress?.((payload) => {
      if (!payload) {
        return;
      }

      setUpdateDownloadPercent(Math.max(0, Math.min(100, payload.percent || 0)));
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  if (loading) {
    return <div className="grid h-screen place-items-center bg-wind-dark5 text-wind-text">Loading...</div>;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route
          path="/invite/:inviteCode"
          element={<JoinInvitePage />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {desktopUpdate ? (
        <div className="fixed bottom-4 right-4 z-[80] w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#10131c]/95 p-4 shadow-2xl backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wind-muted">Desktop Update Available</p>
          <p className="mt-1 text-sm font-semibold text-white">Version {desktopUpdate.latestVersion} is available</p>
          <p className="mt-1 text-xs text-wind-muted">You are currently on {desktopUpdate.localVersion}.</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={updateDownloadInProgress}
              className="wc-accent-button rounded-xl px-3 py-2 text-xs font-semibold text-white"
              onClick={() => {
                if (updateDownloadInProgress) {
                  return;
                }

                setUpdateDownloadInProgress(true);
                setUpdateDownloadPercent(0);
                void (async () => {
                  try {
                    const result = await window.windcordDesktop?.downloadAndInstallUpdate?.();
                    if (!result?.ok) {
                      throw new Error(result?.error || "Could not start update installer.");
                    }
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Could not start update installer.";
                    window.alert(message);
                    setUpdateDownloadInProgress(false);
                    setUpdateDownloadPercent(0);
                  }
                })();
              }}
            >
              {updateDownloadInProgress ? "Downloading..." : "Download Update"}
            </button>
            <button
              type="button"
              disabled={updateDownloadInProgress}
              className="wc-secondary-button rounded-xl px-3 py-2 text-xs font-semibold text-wind-text"
              onClick={() => setDesktopUpdate(null)}
            >
              Later
            </button>
          </div>
          {updateDownloadInProgress ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--wc-active-top),var(--wc-active-bottom))] transition-[width] duration-200"
                  style={{ width: `${updateDownloadPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-wind-muted">{updateDownloadPercent}%</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default AppRouter;
