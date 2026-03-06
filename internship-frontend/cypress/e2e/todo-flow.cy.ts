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

function loginAsGuestAndOpenTodos() {
  clearClientState();
  cy.reload();
  cy.contains("button", "Continue as Guest").click();
  cy.url().should("not.include", "/login");
  cy.visit("/todos");
  cy.contains("h1", "Todos").should("be.visible");
}

function addTodo(text: string) {
  cy.get('input[placeholder*="todo"]').type(text);
  cy.contains("button", "Add").click();
}

describe("Todo Flow", () => {
  beforeEach(() => {
    loginAsGuestAndOpenTodos();
  });

  it("adds a todo and trims text", () => {
    addTodo("   Buy milk   ");

    cy.contains("li", "Buy milk").should("be.visible");
    cy.get('input[placeholder*="todo"]').should("have.value", "");
    cy.contains("0/1 completed (0%)").should("be.visible");
  });

  it("toggles completion and deletes with confirmation", () => {
    addTodo("Pay electricity bill");

    cy.contains("li", "Pay electricity bill")
      .as("todoItem")
      .within(() => {
        cy.get('input[type="checkbox"]').click();
      });

    cy.get("@todoItem").contains("span", "Pay electricity bill").should("have.class", "line-through");
    cy.contains("1/1 completed (100%)").should("be.visible");

    cy.get("@todoItem").contains("button", "Remove").click();
    cy.contains("Delete Todo").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("li", "Pay electricity bill").should("be.visible");

    cy.contains("li", "Pay electricity bill").contains("button", "Remove").click();
    cy.contains("button", "Delete").click();
    cy.contains("No todos yet. Add one above").should("be.visible");
  });

  it("shows signup prompt when guest exceeds 3 todos", () => {
    addTodo("Todo 1");
    addTodo("Todo 2");
    addTodo("Todo 3");
    addTodo("Todo 4");

    cy.contains("Sign up to create unlimited todos").should("be.visible");
    cy.contains("li", "Todo 4").should("not.exist");
  });
});
