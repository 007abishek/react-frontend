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

// Firebase auth → Redux
startAuthListener(store.dispatch);

// Initialize Sentry BEFORE rendering React
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],

  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
  replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          {/* Error Boundary */}
          <Sentry.ErrorBoundary fallback={<p>Something went wrong 😢</p>}>
            <App />
          </Sentry.ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
