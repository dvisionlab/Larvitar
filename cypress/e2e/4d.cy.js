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
  });

  it("should handle slices mode", () => {
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const imageIndex = larvitar.store.get([
          "viewports",
          "viewer",
          "sliceId"
        ]);
        cy.wrap(imageIndex).as("initialimageIndex");
      });
    cy.get("#viewer").trigger("wheel");
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const imageIndex = larvitar.store.get([
          "viewports",
          "viewer",
          "sliceId"
        ]);
        cy.get("@initialimageIndex").then(initialimageIndex => {
          expect(imageIndex).to.not.equal(initialimageIndex);
        });
      });
    cy.get("#slicenum").should("exist")
    cy.get("#slicenum").invoke("text").then(text => { expect(text).to.contain("Slice Number: 2 of 2") })
  });

  it("should toggle frames mode", () => {
    cy.get("#toggleButton").click()
    cy.get("#animation").should("exist")
    cy.get("#animation").invoke("text").then(text => { expect(text).to.contain("Scroll Mode Active: Frames.") })

    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const imageIndex = larvitar.store.get([
          "viewports",
          "viewer",
          "sliceId"
        ]);
        cy.wrap(imageIndex).as("initialimageIndex");
      });
    cy.get("#viewer").trigger("wheel");
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const imageIndex = larvitar.store.get([
          "viewports",
          "viewer",
          "sliceId"
        ]);
        cy.get("@initialimageIndex").then(initialimageIndex => {
          expect(imageIndex).to.not.equal(initialimageIndex);
        });
      });
    cy.get("#image-time").should("exist")
    cy.get("#image-time").invoke("text").then(text => { expect(text).to.contain("Image Time Id: 1 of 96") })
  });
});
