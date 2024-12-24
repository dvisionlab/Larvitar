describe("Larvitar DICOM PDF Rendering", () => {
  beforeEach(() => {
    // Visit the page where your HTML is served
    cy.visit("../../docs/examples/pdf.html"); // Adjust URL as necessary
  });

  it("should load and render the viewer with DICOM PDF", () => {
    // Check if the viewer element is visible
    cy.get("#viewer").should("be.visible");

    // Simulate the loading of the DICOM PDF file and the rendering process
    cy.window().then(win => {
      // Ensure larvitar is initialized before interacting with it
      cy.wrap(win.larvitar)
        .should("exist")
        .then(larvitar => {
          // Retry until setToolActive is available
          cy.wrap(larvitar)
            .should("have.property", "setToolActive") // Wait until the method exists
            .then(() => {
              // Replace setToolActive with a stub to track calls and log arguments
              const toolActiveStub = cy
                .stub(larvitar, "setToolActive")
                .callsFake(arg => {
                  console.log("setToolActive called with:", arg);
                })
                .as("setToolActiveStub");

              // Wait for the PDF to be loaded and rendered (adjust duration as needed)
              cy.wait(2000); // Adjust this duration based on how long it takes to render

              // Verify that setToolActive was called with "Pan"
              cy.get("@setToolActiveStub").should("have.been.called");

              // Check the arguments that were passed to setToolActive
              cy.get("@setToolActiveStub").should(
                "have.been.calledWith",
                "Pan"
              );
            });
        });
    });

    // Check if the viewer's layout is updated after rendering the DICOM PDF
    cy.get("#viewer").should("have.class", "col-8");
  });
});
