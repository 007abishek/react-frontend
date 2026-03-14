import type{Request,Response} from "express";
import { verifyOTP } from "../../services/hasura/otp.service"; 
import db from "../../config/knex";

interface VerifyOtpInput{
    email: string;
    otp: string;
    purpose?: string;
}

interface HasuraVerifyOtpPayload{
    // Hasura sends: { input: { email, otp, purpose? }, action: { name }, ... }
    // Some older clients/actions may send: { input: { input: { ... } } }
    input: VerifyOtpInput | { input: VerifyOtpInput };
    action:{name:string};
}

export async function handleVerifyOtpAction(req: Request , res: Response): Promise<void>{
    const payload=req.body as HasuraVerifyOtpPayload;
    const args = (payload.input as any)?.input ?? payload.input;
    const email = args?.email;
    const otp = args?.otp;
    const purpose = args?.purpose;

    if(!email || !otp){
        res.status(200).json({ success: false, message: "Email and Otp are required" });
        return;

    }

    if (typeof email !== "string" || typeof otp !== "string") {
        res.status(200).json({ success: false, message: "Email and Otp are required" });
        return;
    }

    if (purpose !== undefined && typeof purpose !== "string") {
        res.status(200).json({ success: false, message: "purpose must be a string." });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPurpose = (purpose ?? "").trim().toLowerCase() || "email_verification";

    const result=await verifyOTP(normalizedEmail,otp.trim(), normalizedPurpose);

    if(!result.success){

        res.status(200).json({ success: false, message: result.message });
        return;
    }

    if (normalizedPurpose === "email_verification" || normalizedPurpose === "signup") {
        try {
            await db("users").where({ email: normalizedEmail }).update({ email_verified: true });
        } catch (err) {
            console.warn("Failed to set users.email_verified after OTP verification:", err);
        }
    }

    res.json({success: true, message: result.message});
}
