class ProductsPage {
  visit() {
    cy.visit("/products");
  }

  addFirstProductToCart() {
    cy.contains("button", "Add to Cart").first().click();
  }
}

export default new ProductsPage();
