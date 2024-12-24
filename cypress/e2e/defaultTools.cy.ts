describe("Larvitar - Default Tools Example", () => {
  beforeEach(() => {
    // Replace with the path or URL to your HTML page.
    cy.visit("../../docs/examples/defaultTools.html"); // Adjust URL as necessary
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
    cy.get(".cornerstone-canvas")
      .should("exist")
      .then($img => {
        const initialWidth = $img.width();
        const initialHeight = $img.height();
        cy.get("#viewer")
          .trigger("dragstart", "center", { button: 2, force: true }) // Simulate right-click
          .trigger("drop", "top", { force: true }); // Move the mouse
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
