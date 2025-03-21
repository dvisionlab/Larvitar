describe("Testing the 4d.html functionalities", () => {
  beforeEach(() => {
    // Visit the HTML file
    cy.visit("../../docs/examples/4d.html");

    // Wait for the viewer to be visible
    cy.get("#viewer").should("be.visible");

    // Set up a global window property to track when files are loaded
    cy.window().then(win => {
      win.allFilesLoaded = false;

      // Ensure larvitar exists before modifying it
      if (win.larvitar && win.larvitar.renderImage) {
        // Override renderImage using Object.defineProperty
        const originalRenderImage = win.larvitar.renderImage;

        Object.defineProperty(win.larvitar, "renderImage", {
          configurable: true,
          enumerable: true,
          writable: false, // Keep writable as false to avoid errors
          value: function (...args) {
            return originalRenderImage.apply(this, args).then(result => {
              win.allFilesLoaded = true;
              return result;
            });
          }
        });
      }
    });

    // Wait for files to be loaded
    cy.window().its("allFilesLoaded").should("eq", true, { timeout: 10000 });
    cy.get("#spinner").should("not.be.visible");
    const imageIndex = larvitar.store.get(["viewports", "viewer", "sliceId"]);
  });
});
