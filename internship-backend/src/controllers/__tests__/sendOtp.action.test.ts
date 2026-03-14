import { handleSendOtpAction } from "../hasura/sendOtp.action";
import { sendOTPEmail } from "../../services/hasura/otp.service";

jest.mock("../../services/hasura/otp.service");

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

test("should return 400 if email missing", async () => {
  const req: any = { body: { input: {} } };
  const res = mockRes();

  await handleSendOtpAction(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    message: "Email is required.",
    expiresAt: null,
  });
});

test("should return 400 if email invalid", async () => {
  const req: any = { body: { input: { email: "not-an-email" } } };
  const res = mockRes();

  await handleSendOtpAction(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    message: "Invalid email address.",
    expiresAt: null,
  });
});

test("should send OTP and return expiresAt", async () => {
  const expiresAt = new Date("2026-03-14T00:00:00.000Z");
  (sendOTPEmail as jest.Mock).mockResolvedValue({ expiresAt });

  const req: any = { body: { input: { email: "user@example.com", purpose: "signup" } } };
  const res = mockRes();

  await handleSendOtpAction(req, res);

  expect(sendOTPEmail).toHaveBeenCalledWith("user@example.com", "signup");
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    message: "OTP sent successfully.",
    expiresAt: "2026-03-14T00:00:00.000Z",
  });
});

test("should support nested args shape", async () => {
  const expiresAt = new Date("2026-03-14T00:00:00.000Z");
  (sendOTPEmail as jest.Mock).mockResolvedValue({ expiresAt });

  const req: any = { body: { input: { input: { email: "user@example.com" } } } };
  const res = mockRes();

  await handleSendOtpAction(req, res);

  expect(sendOTPEmail).toHaveBeenCalledWith("user@example.com", undefined);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    message: "OTP sent successfully.",
    expiresAt: "2026-03-14T00:00:00.000Z",
  });
});
