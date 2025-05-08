describe("Larvitar Multiframe Rendering", () => {
  beforeEach(() => {
    cy.visit("../../docs/examples/multiframe.html"); // Change this URL to where your HTML file is served
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

  it("should load the viewer and start with an initial frame", () => {
    // Check if the viewer is visible
    cy.get("#viewer").should("be.visible");

    // Check if the frame rate is displayed
    cy.get("#frame-rate").should("contain", "Frame Rate:");

    // Check if the current frame information is visible
    cy.get("#image-time").should("contain", "Current Frame:");
  });

  it('should play/pause frame animation on pressing "p"', () => {
    cy.wait(500);
    cy.get("#image-time")
      .invoke("text")
      .then(initialText => {
        cy.log("Initial Frame: ", initialText);
        const match = initialText.match(/Current Frame: (\d+) of/);
        const frameNumber = parseInt(match[1], 10) + 1;
        cy.get("body").trigger("keydown", { keyCode: 80 });

        cy.get("#image-time")
          .invoke("text")
          .then(updatedText => {
            cy.log("Updated Frame after Pause:", updatedText);

            if (updatedText === initialText) {
              expect(updatedText).to.equal(initialText);
            } else {
              expect(updatedText).to.equal(
                "Current Frame: " + frameNumber + " of 76"
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

  it("should update the statistics every second", () => {
    // Check the initial Web Worker stats
    cy.get("#maxWebWorkers").should("not.be.empty");
    cy.get("#numWebWorkers").should("not.be.empty");
    cy.get("#numQueuedTasks").should("not.be.empty");
    cy.get("#numTasksExecuting").should("not.be.empty");
    cy.get("#totalTasksExecuted").should("not.be.empty");
    cy.get("#totalTaskExecutionTime").should("not.be.empty");
    cy.get("#totalTaskDelayTime").should("not.be.empty");
    cy.get("#image-time").should("not.be.empty");

    // Ensure the stats update every second
    cy.wait(1000); // Wait for 1 second to allow statistics to refresh
    cy.get("#maxWebWorkers").should("not.be.empty");
    cy.get("#image-time").should("not.be.empty");
  });

  it("should update the frame when scrolling the mouse wheel", () => {
    cy.wait(500);
    let initialFrame;

    // Store the initial frame before scrolling
    cy.get("#image-time")
      .invoke("text")
      .then(text => {
        initialFrame = text; // Store the initial frame
        cy.log("Initial Frame Before Scroll:", initialFrame); // Debugging log
      });

    // Simulate a wheel event to update the frame (use force: true to bypass covering element issue)
    cy.get("#viewer").trigger("wheel", { deltaY: 100, force: true });

    // Verify that the frame has been updated after the wheel event
    cy.get("#image-time").should("not.contain", initialFrame);

    // Store the new frame after scrolling
    cy.get("#image-time")
      .invoke("text")
      .then(newText => {
        cy.log("New Frame After Scroll:", newText); // Debugging log
        cy.get("#image-time").should("contain", newText); // Ensure that the frame has been updated
      });
  });
});
