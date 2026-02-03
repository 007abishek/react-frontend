import "../src/index.css";
import React from "react";

import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import type { Preview } from "@storybook/react";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/context/ThemeContext";

const preview: Preview = {
  decorators: [
    (Story) => (
      <Provider store={store}>
        <ThemeProvider>
          <BrowserRouter>
            <Story />
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    ),
  ],
};

export default preview;
