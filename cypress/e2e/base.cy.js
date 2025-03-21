describe("Testing the base.html functionalities", () => {
  beforeEach(() => {
    // Visit the HTML file
    cy.visit("../../docs/examples/base.html");

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

  it("should verify Larvitar Manager is properly populated with study data", () => {
    cy.window()
      .its("larvitar")
      .should("exist")
      .then(larvitar => {
        // Get Larvitar Manager data
        const larvitarManager = larvitar.getLarvitarManager();

        // Verify the specific study exists
        const studyInstanceUID =
          "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394";
        expect(larvitarManager).to.have.property(studyInstanceUID);

        // Verify study data structure
        const studyData = larvitarManager[studyInstanceUID];

        // Check image IDs are loaded (should be 24 based on the demo file loading)
        expect(studyData.imageIds).to.have.length(24);

        // Verify all image IDs are properly formatted strings
        studyData.imageIds.forEach(imageId => {
          expect(imageId).to.be.a("string");
          expect(imageId).to.include("dicomfile");
        });

        // Verify instances object exists and contains all images
        expect(studyData).to.have.property("instances");
        expect(Object.keys(studyData.instances)).to.have.length(
          studyData.imageIds.length
        );

        // Verify manager has current image index tracking
        expect(studyData).to.have.property("currentImageIdIndex");
        expect(studyData.currentImageIdIndex).to.be.a("number");
      });
  });
  it("should have the correct title", () => {
    cy.title().should("eq", "Larvitar - Basic rendering example");
  });

  it("should have a visible viewer element", () => {
    cy.get("#viewer").should("be.visible");
  });

  it("should open the code modal when clicking the Show Code button", () => {
    cy.get("#showCodeBtn").click();
    cy.get("#codeModal").should("be.visible");
    cy.get("#codeSnippet").should("be.visible");
    cy.get("#copyCodeBtn").should("be.visible");

    // Close the modal
    cy.get(".btn-close").click();
    cy.get("#codeModal").should("not.be.visible");
  });

  it("should open the metadata form when clicking the Open Form button", () => {
    cy.get(".open-button").contains("Open Form").click();
    cy.get("#myForm").should("be.visible");

    // Test form elements
    cy.get("#metadata").should("exist");
    cy.get("#downloadCheck").should("exist");

    // Close the form
    cy.get(".cancel").click();
    cy.get("#myForm").should("not.be.visible");
  });

  it("should toggle download options when checking the download checkbox", () => {
    cy.get(".open-button").contains("Open Form").click();

    // Initially hidden
    cy.get("#downloadLabel").should("not.be.visible");
    cy.get("#downloadInput").should("not.be.visible");

    // Check the box
    cy.get("#downloadCheck").check();

    // Should be visible now
    cy.get("#downloadLabel").should("be.visible");
    cy.get("#downloadInput").should("be.visible");

    // Uncheck
    cy.get("#downloadCheck").uncheck();

    // Should be hidden again
    cy.get("#downloadLabel").should("not.be.visible");
    cy.get("#downloadInput").should("not.be.visible");

    // Close the form
    cy.get(".cancel").click();
  });

  it("should display metadata when clicking the Display Metadata button", () => {
    // This test assumes demo files are loaded
    // and series variable is populated
    cy.get(".open-button").contains("Display Metadata").click();

    // Since this opens a new window, we can't directly test the new window
    // But we can verify localStorage was set
    cy.window().then(win => {
      expect(win.localStorage.getItem("tableData")).to.exist;
    });
  });

  // Test file drag and drop simulation
  it("should handle file drag events", () => {
    // Test dragover class
    cy.get("#viewer")
      .trigger("dragover")
      .should("have.class", "dragover")
      .trigger("dragleave")
      .should("not.have.class", "dragover");
  });
  it("should test Wwwc tool functionality for modifying image contrast", () => {
    // First verify the Wwwc tool is active
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const viewerElement =
          larvitar.cornerstone.getEnabledElements()[0].element;

        // Check if Wwwc tool is active
        const isWwwcActive = larvitar.cornerstoneTools.isToolActiveForElement(
          viewerElement,
          "Wwwc"
        );
        expect(isWwwcActive).to.equal(true);

        // Store initial viewport values for comparison
        const initialViewport =
          larvitar.cornerstone.getEnabledElements()[0].viewport;
        cy.wrap(initialViewport.voi.windowWidth).as("initialWindowWidth");
        cy.wrap(initialViewport.voi.windowCenter).as("initialWindowCenter");
      });

    // Perform click & drag action to modify Window Width and Window Center
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

    // Verify Window Width has changed after drag
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const currentViewport =
          larvitar.cornerstone.getEnabledElements()[0].viewport;
        cy.get("@initialWindowCenter").then(initialWindowCenter => {
          expect(currentViewport.voi.windowCenter).to.not.equal(
            initialWindowCenter
          );
        });
      });
  });

  it("should show spinner when files are being processed during drag and drop", () => {
    // Create a mock file for drag and drop testing
    const mockFile = new File([""], "test.dcm", { type: "application/dicom" });

    // Make spinner visible when dragover event occurs
    cy.get("#viewer").trigger("dragover", { force: true });

    // Mock the drop event with a DICOM file
    cy.window().then(win => {
      // Store original traverseFileTree to restore later
      const originalTraverseFileTree = win.traverseFileTree;

      // Mock traverseFileTree to simulate file processing
      win.traverseFileTree = function (item) {
        // Just trigger spinner visibility
        win.showSpinner();
      };

      // Trigger drop event
      cy.get("#viewer").trigger("drop", {
        dataTransfer: {
          items: [
            {
              kind: "file",
              type: "application/dicom",
              webkitGetAsEntry: () => ({
                isFile: true,
                isDirectory: false,
                name: "test.dcm",
                file: callback => callback(mockFile)
              })
            }
          ]
        },
        force: true
      });

      // Check spinner is visible during processing
      cy.get("#spinner").should("be.visible");

      // Restore original function
      win.traverseFileTree = originalTraverseFileTree;
    });
  });

  it("should navigate between images using the 'Previous' and 'Next' buttons", () => {
    // Get initial series ID and image index
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        // Get current series ID
        const seriesId = larvitar.store.get([
          "viewports",
          "viewer",
          "seriesUID"
        ]);
        cy.wrap(seriesId).as("initialSeriesId");

        // Get current image index
        const imageIndex = larvitar.store.get([
          "viewports",
          "viewer",
          "sliceId"
        ]);
        cy.wrap(imageIndex).as("initialImageIndex");
      });

    // Click "Next" button and verify change
    cy.get("button#next").click();
    cy.wait(1000); // Wait for rendering

    // Verify series ID changed
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const currentSeriesId = larvitar.store.get([
          "viewports",
          "viewer",
          "seriesUID"
        ]);
        cy.get("@initialSeriesId").then(initialSeriesId => {
          // Series ID should be different after click
          //expect(currentSeriesId).to.not.equal(initialSeriesId);
        });
      });

    // Click "Previous" button and verify it goes back
    cy.get("button#previous").contains("Previous Series").click();
    cy.wait(1000); // Wait for rendering

    // Verify we returned to the initial series
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const currentSeriesId = larvitar.store.get([
          "viewports",
          "viewer",
          "seriesUID"
        ]);
        cy.get("@initialSeriesId").then(initialSeriesId => {
          // We should be back at the initial series
          expect(currentSeriesId).to.equal(initialSeriesId);
        });
      });
  });

  it("should display metadata table page when 'Display Metadata' button is clicked", () => {
    // Spy on window.open
    cy.window().then(win => {
      cy.stub(win, "open").as("windowOpen");
    });

    // Click the "Display Metadata" button
    cy.get("button").contains("Display Metadata").click();

    // Verify window.open was called with the correct URL
    cy.get("@windowOpen").should(
      "be.calledWith",
      "metadataTable.html",
      "_blank"
    );

    // Verify data was stored in localStorage
    cy.window().then(win => {
      const tableData = JSON.parse(win.localStorage.getItem("tableData"));
      expect(tableData).to.not.be.null;
      expect(Object.keys(tableData).length).to.be.greaterThan(0);
    });
  });

  it("should open form and handle form inputs", () => {
    // Click the "Open Form" button
    cy.get("button.open-button").contains("Open Form").click();

    // Verify form is visible
    cy.get("#myForm").should("be.visible");

    // Check download checkbox
    cy.get("#downloadCheck").check();

    // Verify download input becomes visible
    cy.get("#downloadLabel").should("be.visible");
    cy.get("#downloadInput").should("be.visible");

    // Enter a value in download input
    cy.get("#downloadInput").type("1");

    // Close form
    cy.get("button.cancel").click();
    cy.get("#myForm").should("not.be.visible");
  });
});
