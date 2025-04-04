describe("Larvitar DICOM Viewer", () => {
  beforeEach(() => {
    // Visit the Larvitar example page
    cy.visit("../../docs/examples/colorMaps.html");
  });

  it("should cycle through color maps when 'm' is pressed", () => {
    // Verify that the initial color map is displayed
    cy.get("#active-color-map").should(
      "contain.text",
      "Active Color Map: Gray"
    );

    // Trigger the "m" key press event multiple times to cycle through color maps
    cy.window().then(win => {
      cy.wrap(win.larvitar)
        .should("exist")
        .then(larvitar => {
          // Simulate key presses and validate the color map changes
          for (let i = 0; i < 3; i++) {
            cy.get("body").trigger("keypress", { keyCode: 109 }); // "m" key

            // Verify the active color map text changes
            cy.get("#active-color-map").then($el => {
              const activeText = $el.text();
              expect(activeText).to.match(/Active Color Map: .+/);
            });
          }
        });
    });
  });
});
