const dbMock: any = jest.fn();
dbMock.transaction = jest.fn();
dbMock.fn = {
  now: jest.fn(() => new Date("2026-01-01T00:00:00.000Z")),
};
dbMock.raw = jest.fn((sql: string) => sql);

jest.mock("../../../config/knex", () => ({
  __esModule: true,
  default: dbMock,
}));

const inventoryModelMock = {
  checkAvailability: jest.fn(),
};

jest.mock("../../../models/inventory.model", () => ({
  __esModule: true,
  default: inventoryModelMock,
}));

const orderModelMock = {
  getByOrderId: jest.fn(),
  createWithTrx: jest.fn(),
};

jest.mock("../../../models/order.model", () => ({
  __esModule: true,
  default: orderModelMock,
}));

const temporalClientMock = {
  cancelWorkflowById: jest.fn(),
};

jest.mock("../../../temporal/client", () => ({
  __esModule: true,
  cancelWorkflowById: (...args: unknown[]) => temporalClientMock.cancelWorkflowById(...args),
}));

import { createOrderFromActionInput } from "../order.service";

const createProductsChain = () => {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.whereIn = jest.fn(async () => [
    { id: 101, title: "Item 101", price: 100, thumbnail: "a.png" },
  ]);
  return chain;
};

describe("order.service createOrderFromActionInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cancels superseded workflow when changed checkout creates a new order attempt", async () => {
    dbMock.mockImplementation((table: string) => {
      if (table === "products") return createProductsChain();
      throw new Error(`Unexpected table outside transaction: ${table}`);
    });

    inventoryModelMock.checkAvailability.mockResolvedValue({
      available: true,
      currentStock: 10,
      reserved: 0,
    });
    orderModelMock.getByOrderId.mockResolvedValue(null);
    orderModelMock.createWithTrx.mockResolvedValue({
      id: 33,
      order_id: "ORD-NEW",
    });

    const checkoutLookupChain: any = {};
    checkoutLookupChain.select = jest.fn(() => checkoutLookupChain);
    checkoutLookupChain.where = jest.fn(() => checkoutLookupChain);
    checkoutLookupChain.first = jest.fn(() => checkoutLookupChain);
    checkoutLookupChain.forUpdate = jest.fn(async () => null);

    const explicitOrderChain: any = {};
    explicitOrderChain.select = jest.fn(() => explicitOrderChain);
    explicitOrderChain.where = jest.fn(() => explicitOrderChain);
    explicitOrderChain.first = jest.fn(async () => null);

    const pendingOrdersChain: any = {};
    pendingOrdersChain.select = jest.fn(() => pendingOrdersChain);
    pendingOrdersChain.where = jest.fn(() => pendingOrdersChain);
    pendingOrdersChain.andWhereNot = jest.fn(() => pendingOrdersChain);
    pendingOrdersChain.forUpdate = jest.fn(async () => [{ id: 7, order_id: "ORD-OLD" }]);

    const ordersUpdateChain: any = {};
    ordersUpdateChain.whereIn = jest.fn(() => ordersUpdateChain);
    ordersUpdateChain.update = jest.fn(async () => 1);

    const paymentsUpdateChain: any = {};
    paymentsUpdateChain.whereIn = jest.fn(() => paymentsUpdateChain);
    paymentsUpdateChain.update = jest.fn(async () => 1);

    const reservationUpdateChain: any = {};
    reservationUpdateChain.whereIn = jest.fn(() => reservationUpdateChain);
    reservationUpdateChain.andWhere = jest.fn(() => reservationUpdateChain);
    reservationUpdateChain.update = jest.fn(async () => 1);

    const idempotencyUpsertChain: any = {};
    idempotencyUpsertChain.insert = jest.fn(() => idempotencyUpsertChain);
    idempotencyUpsertChain.onConflict = jest.fn(() => idempotencyUpsertChain);
    idempotencyUpsertChain.merge = jest.fn(async () => 1);

    const cartDeleteChain: any = {};
    cartDeleteChain.where = jest.fn(() => cartDeleteChain);
    cartDeleteChain.del = jest.fn(async () => 1);

    let ordersReadCount = 0;
    let checkoutIdempotencyCount = 0;
    const trx: any = jest.fn((table: string) => {
      if (table === "checkout_idempotency") {
        checkoutIdempotencyCount += 1;
        return checkoutIdempotencyCount === 1 ? checkoutLookupChain : idempotencyUpsertChain;
      }

      if (table === "orders") {
        ordersReadCount += 1;
        if (ordersReadCount === 1) return explicitOrderChain;
        if (ordersReadCount === 2) return pendingOrdersChain;
        return ordersUpdateChain;
      }

      if (table === "payments") return paymentsUpdateChain;
      if (table === "inventory_reservations") return reservationUpdateChain;
      if (table === "cart_items") return cartDeleteChain;

      throw new Error(`Unexpected table in transaction: ${table}`);
    });
    trx.fn = { now: jest.fn(() => new Date("2026-01-01T00:00:00.000Z")) };
    trx.raw = jest.fn((sql: string) => sql);

    dbMock.transaction.mockImplementation(async (cb: (trxArg: any) => unknown) => cb(trx));

    const result = await createOrderFromActionInput(
      {
        userId: 1,
        firebaseUid: "uid-1",
      },
      {
        items: [
          {
            productId: 101,
            title: "Item 101",
            price: 100,
            quantity: 1,
          },
        ],
        address: {
          fullName: "Abishek",
          phone: "9999999999",
          email: "a@example.com",
          addressLine1: "Line 1",
          addressLine2: "",
          city: "Chennai",
          state: "Tamil Nadu",
          pincode: "600001",
        },
        paymentMethod: "card",
        total: 100,
        orderId: "ORD-NEW",
      }
    );

    expect(result.orderId).toBe("ORD-NEW");
    expect(temporalClientMock.cancelWorkflowById).toHaveBeenCalledWith("order-ORD-OLD");
    expect(orderModelMock.createWithTrx).toHaveBeenCalledTimes(1);
  });
});

