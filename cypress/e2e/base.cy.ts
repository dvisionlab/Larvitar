describe("Testing the base.html functionalities", () => {
  beforeEach(() => {
    // Visit the HTML file (ensure it's available in the project or use a local server)

    cy.visit("../../docs/examples/base.html"); // Change this to your HTML file's path
  });

  it("should show the spinner when files are being processed", () => {
    cy.get("#viewer").trigger("dragover", { force: true });
    cy.get("#viewer").trigger("drop", {
      dataTransfer: {
        files: [new File([], "dummy.dcm")]
      }
    });

    cy.get("#spinner").should("be.visible");
  });

  it("should render dicom and populate Larvitar Manager with stack images", () => {
    cy.get("#viewer").should("be.visible"); // Wait for viewer to be visible

    // Wait for the 'allFilesLoaded' event
    cy.window().should("have.property", "allFilesLoaded", true);

    // Optionally, you can also check that the spinner has been removed after files are loaded
    cy.get("#spinner").should("not.be.visible");
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const larvitarManager = larvitar.getLarvitarManager();
        expect(larvitarManager).to.have.property(
          "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394"
        );
        const managerData =
          larvitarManager[
            "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394"
          ];
        expect(managerData.imageIds).to.have.length(24);
      });

    // Click the "Display Metadata" button
    cy.get(".open-button").contains("Display Metadata").click();

    // Since window.open() opens a new tab/window, visit the "metadataTable.html"
    cy.visit("../../docs/examples/metadataTable.html");

    // Ensure metadata section has been populated on the new page
    cy.get("#metadataTable tbody tr").should("have.length.greaterThan", 0);
  });

  it('should navigate between images using the "Previous" and "Next" buttons', () => {
    // Assuming the "Previous" and "Next" buttons are working and render the next image
    cy.get("#previous").click();
    cy.get("#viewer").should("not.be.empty"); // Make sure image changes when "Previous" is clicked

    cy.get("#next").click();
    cy.get("#viewer").should("not.be.empty"); // Make sure image changes when "Next" is clicked
  });

  it('should display metadata table page when "Display Metadata" button is clicked', () => {
    cy.get("#viewer").should("be.visible"); // Wait for viewer to be visible

    // Wait for the 'allFilesLoaded' event
    cy.window().should("have.property", "allFilesLoaded", true);

    // Optionally, you can also check that the spinner has been removed after files are loaded
    cy.get("#spinner").should("not.be.visible");
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const larvitarManager = larvitar.getLarvitarManager();
        expect(larvitarManager).to.have.property(
          "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394"
        );
      });

    // Click the "Display Metadata" button
    cy.get(".open-button").contains("Display Metadata").click();

    // Since window.open() opens a new tab/window, visit the "metadataTable.html"
    cy.visit("../../docs/examples/metadataTable.html");

    // Ensure metadata section has been populated on the new page
    cy.get("#metadataTable tbody tr").should("have.length.greaterThan", 0);
  });

  it('should display the "Open Form" button', () => {
    // Check if the Open Form button is present on the page
    cy.get(".open-button").contains("Open Form").should("be.visible");
  });

  it('should open the form when "Open Form" button is clicked', () => {
    // Ensure all files are loaded before proceeding
    cy.window().its("allFilesLoaded").should("eq", true);

    // Click the Open Form button
    cy.get('button.open-button:contains("Open Form")').click();

    // Check if the form is visible
    cy.get("#myForm").should("be.visible");
  });

  it("should submit the form and handle downloading if checkbox is checked", () => {
    cy.get("#viewer").should("be.visible"); // Wait for viewer to be visible

    // Wait for the 'allFilesLoaded' event
    cy.window().should("have.property", "allFilesLoaded", true);

    // Optionally, you can also check that the spinner has been removed after files are loaded
    cy.get("#spinner").should("not.be.visible");
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const larvitarManager = larvitar.getLarvitarManager();
        expect(larvitarManager).to.have.property(
          "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394"
        );
      });
    // Open the metadata form
    // Open the form
    cy.get('button.open-button:contains("Open Form")').click();

    // Wait for the form to be visible
    cy.get("#myForm").should("be.visible");

    // Fill the form
    cy.get("input").first().type("00100001");

    // Check the download checkbox and verify input appears
    cy.get("#downloadCheck").check();
    cy.get("#downloadLabel").should("be.visible");
    cy.get("#downloadInput").should("be.visible");

    // Simulate form submission
    //cy.get("#submit").click();

    const downloadsFolder = Cypress.config("downloadsFolder");
    const fileName = "fileName.zip";

    // Validate the file exists
    // cy.readFile(path.join(downloadsFolder, fileName)).should("exist");
  });
  it("Simulates WWL tool and verifies viewport changes", () => {
    // Step 1: Ensure viewer is visible and files are loaded
    const viewportSelector = "#viewer";
    cy.get(viewportSelector).should("be.visible");

    // Wait for the 'allFilesLoaded' event
    cy.window().should("have.property", "allFilesLoaded", true);

    // Optionally, you can also check that the spinner has been removed after files are loaded
    cy.get("#spinner").should("not.be.visible");
    cy.window()
      .its("larvitar")
      .then(larvitar => {
        const larvitarManager = larvitar.getLarvitarManager();
        expect(larvitarManager).to.have.property(
          "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394"
        );
        const managerData =
          larvitarManager[
            "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394"
          ];
        expect(managerData.imageIds).to.have.length(24);
      });
    // Step 2: Function to get current WWL values from the viewport
    const getWWWCValues = () => {
      return cy
        .window()
        .its("larvitar")
        .should("exist") // Ensure larvitar is available
        .then(larvitar => {
          const larvitarManager = larvitar.getLarvitarManager();

          // Check for WWL tool's active state by its specific identifier
          expect(larvitarManager).to.have.property(
            "1.2.840.113619.2.176.2025.1499492.7391.1171285944.394"
          );

          // Access the first viewport element
          const viewport =
            larvitar.cornerstone.getEnabledElements()[0].viewport;

          // Ensure viewport properties are initialized
          expect(viewport.voi.windowWidth).to.not.be.undefined;
          expect(viewport.voi.windowCenter).to.not.be.undefined;

          // Return the WW and WC values
          const { windowWidth, windowCenter } = viewport.voi;
          return { windowWidth, windowCenter };
        });
    };

    // Step 3: Verify initial WW and WC values
    let initialWW, initialWC;
    getWWWCValues().then(({ windowWidth, windowCenter }) => {
      initialWW = windowWidth;
      initialWC = windowCenter;

      // Assert that the initial WWL tool values are defined
      expect(initialWW).to.not.be.undefined;
      expect(initialWC).to.not.be.undefined;
    });

    // Step 4: Check if WWL tool is active in cornerstoneTools
    cy.window()
      .its("larvitar")
      .should("exist") // Ensure larvitar is defined
      .then(larvitar => {
        expect(larvitar.cornerstoneTools).to.exist;
        expect(larvitar.cornerstoneTools.isToolActiveForElement).to.exist;

        const viewerElement =
          larvitar.cornerstone.getEnabledElements()[0].element;
        const isWwwcActive = larvitar.cornerstoneTools.isToolActiveForElement(
          viewerElement,
          "Wwwc"
        );

        // Verify that WWL tool is active
        expect(isWwwcActive).to.equal(true);
      });
    cy.wait(5000);
    // Step 5: Simulate WWL tool interaction (mouse events for adjustment)
    cy.get(".cornerstone-canvas")
      .trigger("mousedown", {
        force: true,
        which: 1,
        clientX: 305,
        clientY: 563
      })
      .trigger("mousemove", {
        force: true,
        which: 1,
        clientX: 310,
        clientY: 570
      })
      .trigger("mouseup", { force: true, which: 1 });

    // Step 6: Verify that WW and WC values have changed after interaction
    let updatedWW, updatedWC;
    getWWWCValues().then(({ windowWidth, windowCenter }) => {
      updatedWW = windowWidth;
      updatedWC = windowCenter;

      // Assert that WW and WC values have changed
      expect(updatedWW).not.to.equal(initialWW);
      expect(updatedWC).not.to.equal(initialWC);
    });
  });
});
