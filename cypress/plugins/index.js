const {
  addMatchImageSnapshotPlugin
} = require("@simonsmith/cypress-image-snapshot/plugin");

module.exports = (on, config) => {
  addMatchImageSnapshotPlugin(on, config);
};
