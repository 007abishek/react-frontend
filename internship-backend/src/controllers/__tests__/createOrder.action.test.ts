import { handleCreateOrderAction } from "../hasura/createOrder.action";
import { createOrderFromActionInput } from "../../services/hasura/order.service";

jest.mock("../../services/hasura/order.service");

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

//test case 1 missing session

test("should return 400 if session missing", async () => {

  const req: any = {
    body: { input: {} },
    hasuraUser: null
  };

  const res = mockRes();

  await handleCreateOrderAction(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    message: "A valid Hasura user session is required"
  });

});
//test case 2
test("should create order successfully", async () => {

  const mockResult = {
    orderId: "ORD-123",
    orderDate: "2024-01-01",
    status: "pending",
    orderStatus: "pending",
    paymentStatus: "pending",
    paymentMethod: "COD",
    total: 200
  };

  (createOrderFromActionInput as jest.Mock).mockResolvedValue(mockResult);

  const req: any = {
    hasuraUser: { userId: 1, firebaseUid: "abc" },
    body: {
      input: {
        items: [{ productId: 1, quantity: 2 }],
        address: {
          fullName: "Abhishek",
          phone: "9999999999",
          email: "test@gmail.com",
          addressLine1: "Street",
          city: "Bangalore",
          state: "KA",
          pincode: "560001"
        },
        paymentMethod: "COD",
        total: 200
      }
    }
  };

  const res = mockRes();

  await handleCreateOrderAction(req, res);

  expect(createOrderFromActionInput).toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(mockResult);

});

//test case 3-bad request error

test("should return 400 for bad request error", async () => {

  (createOrderFromActionInput as jest.Mock).mockRejectedValue(
    new Error("items array required")
  );

  const req: any = {
    hasuraUser: { userId: 1 },
    body: { input: {} }
  };

  const res = mockRes();

  await handleCreateOrderAction(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    message: "items array required"
  });

});
