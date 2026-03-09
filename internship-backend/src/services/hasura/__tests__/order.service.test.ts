//unit test 

//test cases
//1.input validation
//items empty
//address missing
//paymentMethod missing

//2.product validation
//product not found
//invalid productId
//invalid quantity

//3.inventory validation
//stock available
//stock unavailable

//4.idempotency logic
//same orderId returns existing order

//5. successful order creation
//creates order
//returns correct response

import { createOrderFromActionInput } from "../order.service";
import InventoryModel from "../../../models/inventory.model";
import db from "../../../config/knex";

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
