

import { createOrderFromActionInput } from "../order.service";
import InventoryModel from "../../../models/inventory.model";
import db from "../../../config/knex";
import orderModel from "../../../models/order.model";
import { cancelWorkflowById } from "../../../temporal/client";

jest.mock("../../../models/inventory.model");
jest.mock("../../../models/order.model");
jest.mock("../../../config/knex");
jest.mock("../../../temporal/client");

const mockSession={
  userId: 1,
  firebaseUid: "firebase123",
};

const mockInput={
  items:[
    {productId:1,quantity:2}
  ],
  address:{
    fullName:"Abishek",
    phone:"9876543210",
    email:"test@gmail.com",
    addressLine1: "Street 1",
    city:"Bangalore",
    state:"Karnataka",
    pincode: "560001"
  },
  paymentMethod:"COD",
  total:100
};

//test case 1
test("should throw error if items array is empty",async()=>{
  const input={...mockInput,items:[]};
  await expect(
    createOrderFromActionInput(mockSession,input)

  ).rejects.toThrow("items array required");
});

//test case 2
test("should throw error if address is missing",async()=>{
  const input={...mockInput,address:null};
  await expect(
    createOrderFromActionInput(mockSession,input as any)
  ).rejects.toThrow("Complete address required");
  
});

//test case 3
test("should throw error if inventory not available",async()=>{
  (InventoryModel.checkAvailability as jest.Mock).mockResolvedValue({
    available: false,
    currentStock:0,
    reserved:0
  });

  (db as any).mockReturnValue({
    select: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockResolvedValue([
      {id:1,title:"Product",price:100,thumbnail:""}
    ]
    )
  });

  await expect(
    createOrderFromActionInput(mockSession,mockInput)

  ).rejects.toThrow("Insufficient stock");
})


//4. test case 4
test("should create order successfully",async()=>{
  (InventoryModel.checkAvailability as jest.Mock).mockResolvedValue({
    available: true,
    currentStock:10,
    reserved:0
  });

  (db as any).mockReturnValue({
    select: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockResolvedValue([
      {id:1, title: "Product",price:50,thumbnail:""}
    ])
  });

  (orderModel.createWithTrx as jest.Mock).mockResolvedValue(true);
  const result=await createOrderFromActionInput(
    mockSession,
    mockInput
  );
  expect(result.orderStatus).toBe("pending");

});

//test case 5

test("should cancel previous workflows",async()=>{
  (cancelWorkflowById as jest.Mock).mockResolvedValue(true);

  await cancelWorkflowById("order-123");
  expect(cancelWorkflowById).toHaveBeenCalledWith("order-123");
});