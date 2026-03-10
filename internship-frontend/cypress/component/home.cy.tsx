import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import Home from "../../src/pages/Home";
import { ThemeProvider } from "../../src/context/ThemeContext";
import { loginSuccess } from "../../src/features/auth/authSlice";
import type { AuthUser } from "../../src/features/auth/authSlice";
import { store } from "../../src/app/store";

describe("Home component", () => {
  it("renders dashboard and feature cards", () => {
    const testUser: AuthUser = {
      uid: "u1",
      email: "test@example.com",
      provider: "password",
      isGuest: false,
    };

    store.dispatch(loginSuccess(testUser));

    cy.mount(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/"]}>
            <Home />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    cy.contains("h1", "Dashboard").should("be.visible");
    cy.contains("Quick access to your features").should("be.visible");
    cy.contains("Todos").should("be.visible");
    cy.contains("Products").should("be.visible");
    cy.contains("GitHub").should("be.visible");
  });
});
