/// <reference types="vite/client" />

declare module '@fontsource-variable/noto-sans';

type WindcordDesktopBridge = {
	isDesktop?: boolean;
	apiBaseUrl?: string;
	socketUrl?: string;
};

interface Window {
	windcordDesktop?: WindcordDesktopBridge;
}
