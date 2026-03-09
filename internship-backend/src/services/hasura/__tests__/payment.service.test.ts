jest.mock("../../../config/stripe", () => ({
  __esModule: true,
  stripe: {
    paymentIntents: {
      retrieve: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../../../models/order.model", () => ({
  __esModule: true,
  default: {
    getByOrderId: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock("../../../models/payment.model", () => ({
  __esModule: true,
  default: {
    getByOrderId: jest.fn(),
    updateByOrderId: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../../models/inventory.model", () => ({
  __esModule: true,
  default: {
    getPendingByOrderExternalIds: jest.fn(),
    release: jest.fn(),
  },
}));

jest.mock("../../../temporal/client", () => ({
  __esModule: true,
  getWorkflowHandle: jest.fn(),
}));

const { getPaymentStatusForOrder } = require("../payment.service") as {
  getPaymentStatusForOrder: (orderId: string, userId: number) => Promise<{
    status: string;
    amount: number;
    currency: string;
    provider: string;
  }>;
};
const OrderModel = require("../../../models/order.model").default as {
  getByOrderId: jest.Mock;
};
const PaymentModel = require("../../../models/payment.model").default as {
  getByOrderId: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// test case 1
test("should throw error if order not found", async () => {
  OrderModel.getByOrderId.mockResolvedValue(null);

  await expect(getPaymentStatusForOrder("ORD123", 1)).rejects.toThrow(
    "Order not found"
  );
});

// test case 2
test("should throw error if payment not found", async () => {
  OrderModel.getByOrderId.mockResolvedValue({ id: 1, order_id: "ORD123" });
  PaymentModel.getByOrderId.mockResolvedValue(null);

  await expect(getPaymentStatusForOrder("ORD123", 1)).rejects.toThrow(
    "Payment not found"
  );
});

// test case 3
test("should return payment status", async () => {
  OrderModel.getByOrderId.mockResolvedValue({
    id: 1,
    order_id: "ORD123",
    status: "confirmed",
  });

  PaymentModel.getByOrderId.mockResolvedValue({
    status: "pending",
    amount: 100,
    currency: "inr",
    provider: "stripe",
  });

  const result = await getPaymentStatusForOrder("ORD123", 1);
  expect(result.status).toBe("pending");
  expect(result.amount).toBe(100);
});
