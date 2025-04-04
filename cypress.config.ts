import { defineConfig } from "cypress";
const {
  addMatchImageSnapshotPlugin
} = require("cypress-image-snapshot/plugin");

export default defineConfig({
  defaultCommandTimeout: 20000,
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    reporterEnabled: "spec, mocha-json-reporter"
  },
  e2e: {
    setupNodeEvents(on, config) {
      addMatchImageSnapshotPlugin(on, config);
    }
  }
});
