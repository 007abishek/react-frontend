class CartPage {
  visit() {
    cy.visit("/cart");
  }

  checkout() {
    cy.contains("button", "Proceed to Checkout").click();
  }
}

export default new CartPage();
