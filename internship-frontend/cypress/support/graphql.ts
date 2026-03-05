export function mockGraphQL(operationName: string, fixture: string) {
  cy.intercept("POST", "**/v1/graphql", (req) => {
    if (req.body.operationName === operationName) {
      req.reply({ fixture });
    }
  });
}
