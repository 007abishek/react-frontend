import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import { store } from "./app/store";
import { startAuthListener } from "./features/auth/authListener";
import { ThemeProvider } from "./context/ThemeContext";
import App from "./App";

import "./index.css";

// 🔐 Firebase auth → Redux
startAuthListener(store.dispatch);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
