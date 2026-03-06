const DB_NAME = "internship-app-db";
export {};

function clearClientState() {
  cy.visit("/login");

  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();

    return new Cypress.Promise<void>((resolve) => {
      const request = win.indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
}

function loginAsGuest() {
  clearClientState();
  cy.reload();
  cy.contains("button", "Continue as Guest").click();
  cy.url().should("not.include", "/login");
}

describe("GitHub Dashboard", () => {
  beforeEach(() => {
    loginAsGuest();
    cy.visit("/github");
    cy.contains("h1", "GitHub Search").should("be.visible");
  });

  it("searches and paginates users", () => {
    cy.intercept("GET", "https://api.github.com/search/users*", (req) => {
      const url = new URL(req.url);
      const query = url.searchParams.get("q");
      const page = url.searchParams.get("page");
      const perPage = url.searchParams.get("per_page");

      expect(query).to.eq("john");
      expect(perPage).to.eq("10");

      if (page === "2") {
        req.reply({
          statusCode: 200,
          body: {
            total_count: 2,
            incomplete_results: false,
            items: [
              {
                login: "john-doe-2",
                html_url: "https://github.com/john-doe-2",
              },
            ],
          },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          total_count: 2,
          incomplete_results: false,
          items: [
            {
              login: "john-doe-1",
              html_url: "https://github.com/john-doe-1",
            },
          ],
        },
      });
    }).as("searchUsers");

    cy.get('input[placeholder="Search GitHub users"]').type("john");
    cy.wait("@searchUsers");

    cy.contains("a", "john-doe-1")
      .should("be.visible")
      .and("have.attr", "href", "https://github.com/john-doe-1");
    cy.contains("Page 1").should("be.visible");
    cy.contains("button", "Prev").should("be.disabled");

    cy.contains("button", "Next").click();
    cy.wait("@searchUsers");
    cy.contains("Page 2").should("be.visible");
    cy.contains("a", "john-doe-2").should("be.visible");
  });

  it("searches repositories and shows stars", () => {
    cy.intercept("GET", "https://api.github.com/search/repositories*", {
      statusCode: 200,
      body: {
        total_count: 1,
        incomplete_results: false,
        items: [
          {
            id: 101,
            name: "react-dashboard",
            html_url: "https://github.com/example/react-dashboard",
            stargazers_count: 3210,
          },
        ],
      },
    }).as("searchRepos");

    cy.contains("button", "Repositories").click();
    cy.get('input[placeholder="Search GitHub repos"]').type("dashboard");
    cy.wait("@searchRepos");

    cy.contains("a", "react-dashboard")
      .should("be.visible")
      .and("have.attr", "href", "https://github.com/example/react-dashboard");
    cy.contains("Star: 3210").should("be.visible");
    cy.contains("Page 1").should("be.visible");
  });
});
