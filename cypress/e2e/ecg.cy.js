describe("Larvitar ECG Rendering", () => {
  beforeEach(() => {
    cy.visit("../../docs/examples/ecg.html"); // Change this URL to where your HTML file is served
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

  it("should verify Larvitar Manager is properly populated and ECG data is defined", () => {
    cy.window()
      .its("larvitar")
      .should("exist")
      .then(larvitar => {
        // Get Larvitar Manager data
        const larvitarManager = larvitar.getLarvitarManager();

        // Verify the specific study exists
        const seriesInstanceUID =
          "1.3.12.2.1107.5.4.5.44110.30000005102507444198400000028.512";
        expect(larvitarManager).to.have.property(seriesInstanceUID);

        // Verify ECG plot div existsù
        cy.get("#ecg").should("exist")
        cy.get(".plot-container").should("exist")

        // Verify study data structure
        const seriesData = larvitarManager[seriesInstanceUID];
        expect(seriesData.ecgData).to.not.equal(undefined)

        // Check image IDs are loaded (should be 48 based on the demo file loading)
        expect(seriesData.imageIds).to.have.length(48);

        // Verify all image IDs are properly formatted strings
        seriesData.imageIds.forEach(imageId => {
          expect(imageId).to.be.a("string");
          expect(imageId).to.include("multiFrameLoader");
        });

        // Verify instances object exists and contains all images
        expect(seriesData).to.have.property("instances");
        expect(Object.keys(seriesData.instances)).to.have.length(
          seriesData.imageIds.length
        );

        // Verify manager has current image index tracking
        expect(seriesData).to.have.property("currentImageIdIndex");
        expect(seriesData.currentImageIdIndex).to.be.a("number");
      });
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

        cy.get("body").trigger("keydown", { keyCode: 80 });

        cy.get("#image-time")
          .invoke("text")
          .then(updatedText => {
            cy.log("Updated Frame after Pause:", updatedText);

            expect(updatedText).to.equal("Current Frame: 10 of 48")
          });

        cy.get("body").type("p");

        cy.wait(500);

        cy.get("#image-time")
          .invoke("text")
          .then(pausedText => {
            cy.log("Played Frame:", pausedText);

            expect(pausedText).not.to.equal(initialText)
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

  it("should update the frame rate", () => {
    cy.wait(500)
    cy.get("#frame-rate").invoke("text")
      .then(initialText => {
        const regex = /Frame Rate: (\d+.\d+)ms/;
        const match = initialText.match(regex);

        const frameRate = match[1];

        cy.get("body").type("+");
        cy.wait(500)
        cy.get("#frame-rate").invoke("text").then(newText => {
          const newMatch = newText.match(regex);

          const newFrameRate = newMatch[1];
          expect(parseFloat(newFrameRate)).to.be.greaterThan(parseFloat(frameRate))
        })
      })
  })
});
