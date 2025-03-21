describe("Larvitar - Default Tools Example", () => {
  beforeEach(() => {
    // Replace with the path or URL to your HTML page.
    cy.visit("../../docs/examples/defaultTools.html"); // Adjust URL as necessary
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

  it("should load the page and display basic elements", () => {
    // Check if the page is loaded correctly
    cy.title().should("include", "Larvitar - Default Tools example");

    // Check if the viewer section is visible
    cy.get("#viewer").should("be.visible");

    // Check if the active tool text is shown and has a default value
    cy.get("#active-tool").should("contain.text", "Active Tool: Wwwc");

    // Ensure that the text instructions are visible
    cy.contains("Left Mouse Button").should("be.visible");
    cy.contains("Right Mouse Button").should("be.visible");
  });

  it("should trigger tool change on keypress", () => {
    cy.get("body").type("t");
    cy.get("#active-tool").should("contain.text", "Active Tool: WwwcRegion");
  });

  it("should zoom and pan on mouse events", () => {
    // Zoom Test - Right-click drag

    // Check if zoom is applied by comparing the size of the image or viewport
    cy.get("#viewer")
      .should("exist")
      .then($img => {
        const initialWidth = $img.width();
        const initialHeight = $img.height();
        cy.get("#viewer")
          .trigger("mousedown", {
            which: 1,
            pageX: 600,
            pageY: 100,
            force: true
          }) // Click and hold
          .trigger("mousemove", {
            which: 1,
            pageX: 600,
            pageY: 600,
            force: true
          })
          .wait(500)
          .trigger("mouseup", { force: true });
        // After zooming, the image size should change (it should either grow or shrink)
        cy.wait(100); // Wait for a brief moment to allow for zoom effect

        cy.get(".cornerstone-canvas").then($imgAfterZoom => {
          const zoomedWidth = $imgAfterZoom.width();
          const zoomedHeight = $imgAfterZoom.height();

          // Assert that the image size has changed
          expect(zoomedWidth).not.to.equal(initialWidth);
          expect(zoomedHeight).not.to.equal(initialHeight);
        });
      });

    // Pan Test - Left-click drag with CTRL (simulate pan)

    // Check if the image has moved (panned)
    cy.get(".cornerstone-canvas")
      .should("exist")
      .then($img => {
        const initialPosition = $img.position();
        cy.get("#viewer")
          .trigger("mousedown", "center")
          .trigger("mousemove", "top")
          .trigger("mouseup"); // Release the mouse button
        // After pan, the image position should change (it should be shifted)
        cy.wait(100); // Wait for the pan effect to take place

        cy.get(".cornerstone-canvas").then($imgAfterPan => {
          const pannedPosition = $imgAfterPan.position();

          // Assert that the image has moved
          expect(pannedPosition.left).not.to.equal(initialPosition.left);
          expect(pannedPosition.top).not.to.equal(initialPosition.top);
        });
      });
  });
});
