jest.mock("nodemailer", () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);
  return {
    createTransport: jest.fn(() => ({ sendMail })),
    __sendMailMock: sendMail,
  };
});

jest.mock("../../../config/knex", () => {
  type EmailOtpRow = {
    id: number;
    email: string;
    purpose: string;
    code_hash: string;
    salt: string;
    attempts: number;
    expires_at: Date;
    consumed_at: Date | null;
    created_at: Date;
  };

  let idSeq = 1;
  const rows: EmailOtpRow[] = [];

  const now = () => new Date();

  class QueryBuilder {
    private predicates: Array<(row: EmailOtpRow) => boolean> = [];
    private orderByColumn: keyof EmailOtpRow | null = null;
    private orderDirection: "asc" | "desc" = "asc";

    where(criteria: Partial<EmailOtpRow>) {
      this.predicates.push((row) =>
        Object.entries(criteria).every(([key, value]) => (row as any)[key] === value)
      );
      return this;
    }

    whereNull(column: keyof EmailOtpRow) {
      this.predicates.push((row) => row[column] === null);
      return this;
    }

    orderBy(column: keyof EmailOtpRow, direction: "asc" | "desc") {
      this.orderByColumn = column;
      this.orderDirection = direction;
      return this;
    }

    forUpdate() {
      return this;
    }

    async first(): Promise<EmailOtpRow | undefined> {
      let result = rows.filter((row) => this.predicates.every((p) => p(row)));
      if (this.orderByColumn) {
        const col = this.orderByColumn;
        const dir = this.orderDirection;
        result = result.sort((a, b) => {
          const av = a[col] as any;
          const bv = b[col] as any;
          if (av === bv) return 0;
          const cmp = av > bv ? 1 : -1;
          return dir === "asc" ? cmp : -cmp;
        });
      }
      return result[0];
    }

    async update(changes: Partial<EmailOtpRow>): Promise<number> {
      const matches = rows.filter((row) => this.predicates.every((p) => p(row)));
      for (const row of matches) {
        Object.assign(row, changes);
      }
      return matches.length;
    }

    async insert(input: Partial<EmailOtpRow>): Promise<number[]> {
      const row: EmailOtpRow = {
        id: idSeq++,
        email: input.email as string,
        purpose: (input.purpose as string) ?? "email_verification",
        code_hash: input.code_hash as string,
        salt: input.salt as string,
        attempts: (input.attempts as number) ?? 0,
        expires_at: input.expires_at as Date,
        consumed_at: (input.consumed_at as Date) ?? null,
        created_at: (input.created_at as Date) ?? now(),
      };
      rows.push(row);
      return [row.id];
    }
  }

  const mockDb: any = (table: string) => {
    if (table !== "email_otps") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return new QueryBuilder();
  };

  mockDb.fn = { now };
  mockDb.transaction = async (fn: (trx: any) => any) => fn(mockDb);

  return { __esModule: true, default: mockDb };
});

import * as otpService from "../otp.service";
import crypto from "crypto";

describe("otp.service", () => {
  beforeEach(() => {
    process.env.NODEMAILER_EMAIL = "test@example.com";
    process.env.NODEMAILER_PASS = "test-pass";
    jest.restoreAllMocks();
  });

  it("sends an OTP email and verifies it once", async () => {
    const nodemailerMock = jest.requireMock("nodemailer") as {
      __sendMailMock: jest.Mock;
    };

    jest.spyOn(crypto, "randomInt").mockReturnValue(123456 as any);

    const { expiresAt } = await otpService.sendOTPEmail("user@example.com");
    expect(expiresAt).toBeInstanceOf(Date);

    expect(nodemailerMock.__sendMailMock).toHaveBeenCalledTimes(1);

    expect((await otpService.verifyOTP("user@example.com", "000000")).success).toBe(
      false
    );
    expect((await otpService.verifyOTP("user@example.com", "123456")).success).toBe(
      true
    );
    expect((await otpService.verifyOTP("user@example.com", "123456")).success).toBe(
      false
    );
  });

  it("scopes OTP by purpose", async () => {
    jest.spyOn(crypto, "randomInt").mockReturnValue(111111 as any);

    await otpService.sendOTPEmail("user@example.com", "signup");

    expect(
      (await otpService.verifyOTP("user@example.com", "111111", "reset")).success
    ).toBe(false);
    expect(
      (await otpService.verifyOTP("user@example.com", "111111", "signup")).success
    ).toBe(true);
  });

  it("locks out after too many attempts", async () => {
    jest.spyOn(crypto, "randomInt").mockReturnValue(222222 as any);

    await otpService.sendOTPEmail("user@example.com");

    for (let i = 0; i < 5; i += 1) {
      expect((await otpService.verifyOTP("user@example.com", "000000")).success).toBe(
        false
      );
    }

    const last = await otpService.verifyOTP("user@example.com", "000000");
    expect(last.success).toBe(false);
    expect(last.message).toMatch(/too many attempts/i);
  });
});
