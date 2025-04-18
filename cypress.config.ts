import { defineConfig } from "cypress";
const {
  addMatchImageSnapshotPlugin
} = require("cypress-image-snapshot/plugin");
const fs = require("fs");
const path = require("path");

export default defineConfig({
  defaultCommandTimeout: 20000,
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    reporterEnabled: "spec, mochawesome",
    mochawesomeReporterOptions: {
      reportDir: "report/json",
      overwrite: false,
      html: false,
      json: true
    }
  },
  e2e: {
    setupNodeEvents(on, config) {
      addMatchImageSnapshotPlugin(on, config);

      on("before:run", () => {
        const reportDir = path.join(__dirname, "report/json");
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }
      });
    }
  }
});
