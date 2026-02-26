const dbMock: any = jest.fn();
dbMock.transaction = jest.fn();
dbMock.fn = { now: jest.fn(() => new Date("2026-01-01T00:00:00.000Z")) };

jest.mock("../../config/knex", () => ({
  __esModule: true,
  default: dbMock,
}));

import inventoryModel from "../inventory.model";

const createProductsChain = (rows: Array<{ id: number; stock: number }>) => {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.whereIn = jest.fn(() => chain);
  chain.forUpdate = jest.fn(async () => rows);
  return chain;
};

const createReservedChain = (
  rows: Array<{ product_id: number; reserved: number | string }>
) => {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.sum = jest.fn(() => chain);
  chain.whereIn = jest.fn(() => chain);
  chain.andWhere = jest.fn(() => chain);
  chain.groupBy = jest.fn(async () => rows);
  return chain;
};

const createInsertChain = (rows: any[]) => {
  const chain: any = {};
  chain.insert = jest.fn(() => chain);
  chain.returning = jest.fn(async () => rows);
  return chain;
};

describe("inventory.model reserve/releaseExpired", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reserve: creates reservations when stock is available", async () => {
    const insertedRows = [
      {
        id: 10,
        user_id: 1,
        product_id: 1001,
        quantity: 2,
        status: "pending",
        expires_at: new Date(),
        created_at: new Date(),
      },
      {
        id: 11,
        user_id: 1,
        product_id: 1002,
        quantity: 1,
        status: "pending",
        expires_at: new Date(),
        created_at: new Date(),
      },
    ];

    const productsChain = createProductsChain([
      { id: 1001, stock: 8 },
      { id: 1002, stock: 4 },
    ]);
    const reservedChain = createReservedChain([
      { product_id: 1001, reserved: 2 },
      { product_id: 1002, reserved: 0 },
    ]);
    const insertChain = createInsertChain(insertedRows);

    const trx: any = jest.fn((table: string) => {
      if (table === "products") return productsChain;
      if (table === "inventory_reservations") {
        const calls = trx.mock.calls.filter((c: [string]) => c[0] === table).length;
        return calls === 1 ? reservedChain : insertChain;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    dbMock.transaction.mockImplementation(async (cb: (trxArg: any) => unknown) => cb(trx));

    const result = await inventoryModel.reserve(1, [
      { productId: 1001, quantity: 2 },
      { productId: 1002, quantity: 1 },
    ]);

    expect(result.success).toBe(true);
    expect(result.reservations).toEqual(insertedRows);
    expect(dbMock.transaction).toHaveBeenCalledTimes(1);
    expect(insertChain.insert).toHaveBeenCalledTimes(1);
  });

  it("reserve: returns an error when requested quantity exceeds availability", async () => {
    const productsChain = createProductsChain([{ id: 7, stock: 5 }]);
    const reservedChain = createReservedChain([{ product_id: 7, reserved: 1 }]);
    const insertChain = createInsertChain([]);

    const trx: any = jest.fn((table: string) => {
      if (table === "products") return productsChain;
      if (table === "inventory_reservations") {
        const calls = trx.mock.calls.filter((c: [string]) => c[0] === table).length;
        return calls === 1 ? reservedChain : insertChain;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    dbMock.transaction.mockImplementation(async (cb: (trxArg: any) => unknown) => cb(trx));

    const result = await inventoryModel.reserve(1, [
      { productId: 7, quantity: 2 },
      { productId: 7, quantity: 3 },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Product 7 - only 4 available, requested 5");
    expect(insertChain.insert).not.toHaveBeenCalled();
  });

  it("releaseExpired: marks expired pending reservations and returns count", async () => {
    const chain: any = {};
    chain.where = jest.fn(() => chain);
    chain.andWhere = jest.fn(() => chain);
    chain.update = jest.fn(() => chain);
    chain.returning = jest.fn(async () => [{ id: 1 }, { id: 2 }, { id: 3 }]);

    dbMock.mockImplementation((table: string) => {
      if (table !== "inventory_reservations") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return chain;
    });

    const count = await inventoryModel.releaseExpired();

    expect(count).toBe(3);
    expect(chain.where).toHaveBeenCalledWith("status", "pending");
    expect(chain.andWhere).toHaveBeenCalledTimes(1);
    expect(chain.update).toHaveBeenCalledWith({ status: "expired" });
    expect(chain.returning).toHaveBeenCalledWith("id");
  });
});
