class ProductsPage {
  visit() {
    cy.visit("/products");
  }

  openFirstProduct() {
    cy.get("h3").first().click();
  }

  addProductToCartFromDetail() {
    cy.contains("button", "Add to Cart").click();
  }
}

export default new ProductsPage();
