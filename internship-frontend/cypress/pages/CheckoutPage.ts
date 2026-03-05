class CheckoutPage {
  fillAddress() {
    cy.get('input[placeholder="Full Name"]').type("Test User");
    cy.get('input[placeholder="Phone Number"]').type("8754891470");
    cy.get('input[placeholder="Email Address"]').type("test@gmail.com");
    cy.get('input[placeholder="Address Line 1"]').type("Test street");
    cy.get('input[placeholder="Address Line 2"]').type("Near test landmark");
    cy.get('input[placeholder="City"]').type("Bangalore");
    cy.get('input[placeholder="State"]').type("Karnataka");
    cy.get('input[placeholder="Pincode"]').type("560001");
  }

  continueToPayment() {
    cy.contains("button", "Continue to Payment").click();
  }

  selectCOD() {
    cy.contains("label", "Cash on Delivery").click();
  }

  reviewOrder() {
    cy.contains("button", "Review Order").click();
  }

  placeOrder() {
    cy.contains("button", "Place Order").click();
  }
}

export default new CheckoutPage();
