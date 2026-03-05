import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "e2e/**/*.cy.{js,jsx,ts,tsx}",
    fixturesFolder: "fixtures",
    supportFile: "support/e2e.ts",
  },
});
