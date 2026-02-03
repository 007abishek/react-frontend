import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import * as Sentry from "@sentry/react";

import { store } from "./app/store";
import { startAuthListener } from "./features/auth/authListener";
import { ThemeProvider } from "./context/ThemeContext";
import App from "./App";

import "./index.css";

// 🔐 Firebase auth → Redux
startAuthListener(store.dispatch);

// ✅ INIT SENTRY AS EARLY AS POSSIBLE
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: true,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],

  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,

  tracePropagationTargets: [
    "localhost",
    /^https:\/\/yourserver\.io\/api/,
  ],

  replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,
  environment: import.meta.env.MODE,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <ThemeProvider>
      <BrowserRouter>
        {/* ✅ ERROR BOUNDARY */}
        <Sentry.ErrorBoundary fallback={<p>Something went wrong 😢</p>}>
          <App />
        </Sentry.ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  </Provider>
);
