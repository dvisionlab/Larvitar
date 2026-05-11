describe("Larvitar DICOM PDF Rendering", () => {
  beforeEach(() => {
    cy.visit("../../docs/examples/pdf.html");
    cy.get("#viewer").should("be.visible");

    cy.window().should(win => {
      const manager = win.larvitar?.getLarvitarManager?.();
      expect(manager && Object.keys(manager).length).to.be.greaterThan(0);
    });

    cy.window().should(win => {
      const elements = win.larvitar?.cornerstone?.getEnabledElements();
      expect(elements).to.have.length.greaterThan(0);
      const stackState = win.larvitar?.cornerstoneTools?.getToolState(
        elements[0].element,
        "stack"
      );
      expect(stackState?.data?.[0]?.imageIds).to.have.length.greaterThan(0);
    });

    cy.get("#spinner").should("not.be.visible");
  });

  it("should wait for cornerstone elements to be enabled and verify Pan activation", () => {
    cy.get("#viewer").should("be.visible");

    cy.window().then(win => {
      const larvitar = win.larvitar;

      expect(larvitar).to.exist;
      expect(larvitar.cornerstoneTools).to.exist;
      expect(larvitar.cornerstone).to.exist;

      const larvitarManager = larvitar.getLarvitarManager();
      expect(larvitarManager).to.have.property(
        "1.2.276.0.7230010.3.1.3.296485376.1.1664404001.305752"
      );

      const element = larvitar.cornerstone.getEnabledElements()[0].element;
      const stackState = larvitar.cornerstoneTools.getToolState(
        element,
        "stack"
      );
      const imageIds = stackState.data[0].imageIds;
      expect(imageIds).to.have.length(4);

      const isPanActive = larvitar.cornerstoneTools.isToolActiveForElement(
        element,
        "Pan"
      );
      expect(isPanActive).to.equal(true);
    });
  });
});
