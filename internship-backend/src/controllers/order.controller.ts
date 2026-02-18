import { Response }  from "express";
import { AuthRequest } from "../middleware/auth";
import OrderModel from "../models/order.model";

export const placeOrder =async(req: AuthRequest , res: Response) => {
    try{
        const userId=req.user?.userId!;

        const result=await OrderModel.createOrder(userId);
        
        if(!result.success){
            return res.status(400).json({message: result.error});
        }

        res.status(201).json({
            message: "Order created successfully",
            orderId: result.orderId,
        });

    }catch(err: any){
        console.error("placeOrder error:",err.message);
        res.status(500).json({message:"Failed to create order"});
    }
};