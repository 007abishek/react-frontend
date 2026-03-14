import type {Request,Response } from "express";
import { sendOTPEmail } from "../../services/hasura/otp.service";

interface SendOtpInput{
    email: string;
    purpose?: string;

}

interface HasuraSendOtpPayload{
    // Hasura sends: { input: { email, purpose? }, action: { name }, ... }
    // Some older clients/actions may send: { input: { input: { ... } } }
    input: SendOtpInput | { input: SendOtpInput };
    action: {name: string};
}

export async function handleSendOtpAction(req:Request,res:Response):Promise<void>{
    const payload=req.body as HasuraSendOtpPayload;
    const args = (payload.input as any)?.input ?? payload.input;
    const email = args?.email;
    const purpose = args?.purpose;
    
    if(!email || typeof email!=="string"){
        res.status(200).json({ success: false, message: "Email is required.", expiresAt: null });
        return;
    }

    if (purpose !== undefined && typeof purpose !== "string") {
        res.status(200).json({ success: false, message: "purpose must be a string.", expiresAt: null });
        return;
    }

    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)){
        res.status(200).json({ success: false, message: "Invalid email address.", expiresAt: null });
        return;
    }

    try{
        const { expiresAt } = await sendOTPEmail(email.toLowerCase().trim(), purpose?.trim());

        res.json({ success: true,message: "OTP sent successfully.", expiresAt: expiresAt.toISOString()});
    }catch(err){
        const rawMessage = err instanceof Error ? err.message : "Failed to send OTP. Please try again.";

        const isTlsCertificateError =
          /self-signed certificate|unable to verify the first certificate|certificate chain/i.test(
            rawMessage
          );

        const devMessage = isTlsCertificateError
          ? `${rawMessage} (Fix: set SMTP_TLS_CA_FILE to your network's Root CA PEM, or for local dev only set SMTP_TLS_REJECT_UNAUTHORIZED=false.)`
          : rawMessage;

        const safeMessage =
          process.env.NODE_ENV === "production"
            ? "Failed to send OTP. Please try again."
            : devMessage;

        console.error("sendOtp action error:", rawMessage);
        // Hasura treats non-2xx action webhook responses as "internal error".
        res.status(200).json({ success: false, message: safeMessage, expiresAt: null });
    }
}
