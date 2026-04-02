describe("Testing the 4d.html functionalities", () => {
  beforeEach(() => {
    cy.visit("../../docs/examples/4d.html");
    cy.get("#viewer").should("be.visible");

    cy.window().should(win => {
      const manager = win.larvitar?.getLarvitarManager?.();
      expect(manager && Object.keys(manager).length).to.be.greaterThan(0);
    });

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
    cy.get("#slicenum").should("exist");
    cy.get("#slicenum")
      .invoke("text")
      .then(text => {
        expect(text).to.contain("Slice Number: 2 of 2");
      });
  });

  it("should toggle frames mode", () => {
    cy.get("#toggleButton").click();
    cy.get("#animation").should("exist");
    cy.get("#animation")
      .invoke("text")
      .then(text => {
        expect(text).to.contain("Scroll Mode Active: Frames.");
      });

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
    cy.get("#image-time").should("exist");
    cy.get("#image-time")
      .invoke("text")
      .then(text => {
        expect(text).to.contain("Image Time Id: 1 of 96");
      });
  });
});
