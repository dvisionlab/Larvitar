import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    downloadsFolder: "cypress/downloads",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    }
  }
});
