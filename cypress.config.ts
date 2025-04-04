import { defineConfig } from "cypress";
const {
  addMatchImageSnapshotPlugin
} = require("cypress-image-snapshot/plugin");

module.exports = defineConfig({
  defaultCommandTimeout: 20000,
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    reporterEnabled: "spec, mocha-json-reporter",
    mochaJsonReporterReporterOptions: {
      output: "cypress-test/test-result.json"
    }
  },
  e2e: {
    setupNodeEvents(on, config) {
      addMatchImageSnapshotPlugin(on, config);
    }
  }
});
