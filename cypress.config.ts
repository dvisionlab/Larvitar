import { defineConfig } from "cypress";
const {
  addMatchImageSnapshotPlugin
} = require("cypress-image-snapshot/plugin");

module.exports = defineConfig({
  reporter: "cypress-multi-reporter",
  reporterOptions: {
    reporterEnabled: "spec, json",
    jsonReporterOptions: {
      output: "cypress-test/test-result.json"
    }
  },
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      addMatchImageSnapshotPlugin(on, config);
    }
  }
});
