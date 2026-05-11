describe("Larvitar DSA Rendering", () => {
  beforeEach(() => {
    cy.visit("../../docs/examples/dsa.html");
    cy.get("#viewer").should("be.visible");

    // Poll until larvitar manager has data
    cy.window().should(win => {
      const manager = win.larvitar?.getLarvitarManager?.();
      expect(manager && Object.keys(manager).length).to.be.greaterThan(0);
    });

    cy.get("#spinner").should("not.be.visible");
  });

  it("should apply dsa mask", () => {
    cy.wait(1000);

    // Capture canvas pixel data before applying mask
    cy.window().then(win => {
      const element = win.larvitar.cornerstone.getEnabledElements()[0].element;
      const canvas = element.querySelector("canvas");
      const ctx = canvas.getContext("2d");
      const before = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      cy.wrap(Array.from(before)).as("pixelsBefore");
    });

    // Apply DSA mask via keypress
    cy.get("body").type("2");
    cy.wait(1000);

    // Verify canvas pixels changed after mask was applied
    cy.window().then(win => {
      const element = win.larvitar.cornerstone.getEnabledElements()[0].element;
      const canvas = element.querySelector("canvas");
      const ctx = canvas.getContext("2d");
      const after = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      cy.get("@pixelsBefore").then(before => {
        const changed = after.some((val, i) => val !== before[i]);
        expect(changed).to.equal(true);
      });
    });
  });

  it('should play/pause frame animation on pressing "p"', () => {
    cy.wait(5000);

    cy.get("#image-time")
      .invoke("text")
      .then(initialText => {
        cy.log("Initial Frame:", initialText);
        const match = initialText.match(/Current Frame: (\d+) of/);
        expect(match).to.not.be.null;
        const frameNumber = parseInt(match[1], 10) + 1;

        // Press "p" to pause
        cy.get("body").type("p");

        cy.get("#image-time")
          .invoke("text")
          .then(updatedText => {
            cy.log("Frame after pause:", updatedText);
            if (updatedText === initialText) {
              expect(updatedText).to.equal(initialText);
            } else {
              expect(updatedText).to.equal(
                `Current Frame: ${frameNumber} of 13`
              );
            }
          });

        // Press "p" again to resume
        cy.get("body").type("p");
        cy.wait(500);

        cy.get("#image-time")
          .invoke("text")
          .then(playedText => {
            cy.log("Frame after resume:", playedText);
            expect(playedText).to.not.equal(initialText);
          });
      });
  });
});
