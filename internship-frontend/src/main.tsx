import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ApolloProvider } from "@apollo/client";
import * as Sentry from "@sentry/react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import App from "@/App";
import { store } from "@/app/store";
import ToastProvider from "@/components/toast/ToastProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { startAuthListener } from "@/features/auth/authListener";
import { apolloClient } from "@/utils/apolloClient";

import "@/index.css";

startAuthListener(store.dispatch);//restores the user session,tokens,and cart data automatically

// const sentryEnabled =
//   import.meta.env.VITE_SENTRY_ENABLED === "true" &&
//   Boolean(import.meta.env.VITE_SENTRY_DSN);
const sentryEnabled = false;

if (sentryEnabled) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: import.meta.env?.DEV ? 1.0 : 0.2,
    replaysSessionSampleRate: import.meta.env?.DEV ? 1.0 : 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <Provider store={store}>
        <ThemeProvider>
          <Elements stripe={stripePromise}>
            <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
              <ToastProvider>
                <App />
              </ToastProvider>
            </Sentry.ErrorBoundary>
          </Elements>
        </ThemeProvider>
      </Provider>
    </ApolloProvider>
  </React.StrictMode>
);
