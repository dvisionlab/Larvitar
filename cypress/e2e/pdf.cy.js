describe("Larvitar DICOM PDF Rendering", () => {
  beforeEach(() => {
    cy.visit("../../docs/examples/pdf.html"); // Adjust URL as necessary
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
  });

  it("should wait for cornerstone elements to be enabled and verify Pan activation", () => {
    const viewportSelector = "#viewer";
    cy.get(viewportSelector).should("be.visible");
    cy.wait(1000);
    cy.window().then(win => {
      cy.wrap(win.larvitar)
        .should("exist")
        .then(larvitar => {
          // Stub the `setToolActive` method
          // cy.stub(larvitar, "setToolActive").as("setToolActiveStub");
          const larvitarManager = larvitar.getLarvitarManager();

          // Check for WWL tool's active state by its specific identifier
          expect(larvitarManager).to.have.property(
            "1.2.276.0.7230010.3.1.3.296485376.1.1664404001.305752"
          );
          expect(larvitar.cornerstoneTools).to.exist;
          expect(larvitar.cornerstone).to.exist;

          const element = larvitar.cornerstone.getEnabledElements()[0].element;
          console.log(element);
          //expect(larvitar.cornerstoneTools.isToolActiveForElement).to.exist;
          const imageIds = larvitar.cornerstoneTools.getToolState(
            element,
            "stack"
          ).data[0].imageIds;
          expect(imageIds.length).to.equal(4);
          // Validate "Pan" tool activation
          const isPanActive = larvitar.cornerstoneTools.isToolActiveForElement(
            element,
            "Pan"
          );

          expect(isPanActive).to.equal(true);
          // Wait for cornerstone to have enabled elements
        });
    });
  });
});
