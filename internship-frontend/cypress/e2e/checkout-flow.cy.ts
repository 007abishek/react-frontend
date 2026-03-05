import productsPage from "../pages/ProductsPage"
import cartPage from "../pages/CartPage"
import checkoutPage from "../pages/CheckoutPage"

import { mockGraphQL } from "../support/graphql"

describe("Checkout Flow",()=>{
    beforeEach(()=>{
        mockGraphQL("GetProducts","products.json")
        mockGraphQL("CreateOrder","order.json")
    })

    it("User completes checkout using COD",()=>{
        productsPage.visit()

        productsPage.addFirstProductToCart()

        cartPage.visit()

        cartPage.checkout()

        checkoutPage.fillAddress()

        checkoutPage.continueToPayment()

        checkoutPage.selectCOD()

        checkoutPage.reviewOrder()

        checkoutPage.placeOrder()

        cy.contains("Order Placed Successfully").should("be.visible")


    })
})
