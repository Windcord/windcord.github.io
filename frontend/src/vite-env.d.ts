/// <reference types="vite/client" />

declare module '@fontsource-variable/noto-sans';

type WindcordDesktopBridge = {
	isDesktop?: boolean;
	apiBaseUrl?: string;
	socketUrl?: string;
	checkForUpdates?: () => Promise<{
		updateAvailable: boolean;
		latestVersion: string;
		localVersion: string;
		releaseUrl: string;
		error?: string;
	}>;
	openReleasePage?: (url?: string) => Promise<void>;
	downloadAndInstallUpdate?: () => Promise<{
		ok: boolean;
		installerPath?: string;
		error?: string;
	}>;
	onUpdateDownloadProgress?: (handler: (payload: {
		phase: "starting" | "downloading" | "downloaded";
		percent: number;
	}) => void) => () => void;
	onUpdateAvailable?: (handler: (payload: {
		updateAvailable: boolean;
		latestVersion: string;
		localVersion: string;
		releaseUrl: string;
	}) => void) => () => void;
};

interface Window {
	windcordDesktop?: WindcordDesktopBridge;
}
