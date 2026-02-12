<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# Automatic Tests in Larvitar

[Cypress](https://docs.cypress.io/app/end-to-end-testing/writing-your-first-end-to-end-test) is a modern, fast, and reliable JavaScript-based end-to-end testing framework designed for web applications. It allows developers to write tests that interact with the UI, simulate user actions, and verify application behavior. Unlike Selenium, Cypress runs directly in the browser, providing better debugging capabilities and a more intuitive API.

# How Cypress Works in These Tests

Cypress operates by executing commands sequentially, ensuring that each step completes before moving to the next. In these tests, Cypress:

- Visits the example html page to initialize the application and ensure the dicom is correctly rendered as `beforeEach` action.
- Uses `cy.get()` to locate elements within the DOM and assert their properties.
- Utilizes `cy.window()` to interact with the JavaScript context of the page.
- Triggers events like clicks, keyboard presses, and scrolls to simulate user actions.
- Ensures proper test execution with assertions such as `should()` and `expect()`.

# How to run existing Tests
You can run Cypress tests in Larvitar using the following npm commands:

```typescript
// Open Cypress Test Runner in interactive mode
npm run cypress

//Run all tests headlessly (for CI environments)
npm run cypress:run

```

# Continuous Integration
Larvitar's tests run automatically when a PR is opened through GitHub Actions. The workflow:

- Triggers on pull request events
- Sets up the environment with Node.js
- Installs dependencies
- Builds the project
- Runs Cypress tests headlessly
- Generates test reports that can be reviewed in the PR

This ensures that all code changes are validated against the test suite before merging, maintaining code quality and preventing regressions.


<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
