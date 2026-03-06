import productsPage from "../pages/ProductsPage"
import cartPage from "../pages/CartPage"
import checkoutPage from "../pages/CheckoutPage"

import { mockGraphQL } from "../support/graphql"

describe("Checkout Flow",()=>{
    beforeEach(()=>{
        mockGraphQL("GetProducts","products.json")
        mockGraphQL("GetProductById","product-by-id.json")
        mockGraphQL("CreateOrder","order.json")

        cy.visit("/login")
        cy.contains("button", "Continue as Guest").click()
        cy.window().then((win) => {
            win.localStorage.setItem("jwt", "dummy-hasura-token")
        })
    })

    it("User completes checkout using COD",()=>{
        productsPage.visit()

        productsPage.openFirstProduct()

        productsPage.addProductToCartFromDetail()

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
