import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "@fontsource-variable/noto-sans";
import AppRouter from "./App";
import "./index.css";
import { applyStoredThemePreference } from "./lib/theme";
import { isDesktopApp } from "./lib/runtimeConfig";

applyStoredThemePreference();

const isDesktop = isDesktopApp();
const Router = isDesktop ? HashRouter : BrowserRouter;
const routerBasename = isDesktop ? "/" : import.meta.env.BASE_URL;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router basename={routerBasename}>
      <AppRouter />
    </Router>
  </React.StrictMode>
);
