// import { addMatchImageSnapshotCommand } from "../../node_modules/cypress-image-snapshot/command"

// // Configure the image snapshot plugin
// addMatchImageSnapshotCommand({
//   failureThreshold: 0.03, // 3% difference allowed
//   failureThresholdType: 'percent',
//   customDiffConfig: {
//     threshold: 0.1 // Sensitivity of comparison
//   }
// });

describe("Larvitar DSA Rendering", () => {
  beforeEach(() => {
    cy.visit("../../docs/examples/dsa.html"); // Change this URL to where your HTML file is served
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
  });

  it("should apply dsa mask", () => {
    cy.wait(1000);
    cy.screenshot("before");
    cy.get("body").type("2");
    cy.wait(1000);
    cy.screenshot("after");

    cy.get("body").matchImageSnapshot("after");
  });

  it('should play/pause frame animation on pressing "p"', () => {
    cy.wait(5000);
    cy.get("#image-time")
      .invoke("text")
      .then(initialText => {
        cy.log("Initial Frame: ", initialText);
        const match = initialText.match(/Current Frame: (\d+) of/);
        const frameNumber = parseInt(match[1], 10);

        cy.get("body").type("p");

        cy.get("#image-time")
          .invoke("text")
          .then(updatedText => {
            cy.log("Updated Frame after Pause:", updatedText);
            if (updatedText === initialText) {
              expect(updatedText).to.equal(initialText);
            } else {
              expect(updatedText).to.equal(
                "Current Frame: " + frameNumber + " of 13"
              );
            }
          });

        cy.get("body").type("p");

        cy.wait(500);

        cy.get("#image-time")
          .invoke("text")
          .then(pausedText => {
            cy.log("Played Frame:", pausedText);

            expect(pausedText).not.to.equal(initialText);
          });
      });
  });
});
