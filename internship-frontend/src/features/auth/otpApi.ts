import { resolveHasuraUrl } from "@/utils/hasuraUrl";
//otp mutation
type GraphQLError = { message?: string };
type GraphQLEnvelope<TData> = { data?: TData; errors?: GraphQLError[] };

type SendOtpResult = { success: boolean; message: string; expiresAt?: string | null };
type VerifyOtpResult = { success: boolean; message: string };

async function postHasura<TData>(
  query: string,
  variables: Record<string, unknown>
): Promise<{ ok: boolean; status: number; json: GraphQLEnvelope<TData> | null }> {
  const url = resolveHasuraUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });



  let json: GraphQLEnvelope<TData> | null = null;
  try {
    json = (await res.json()) as GraphQLEnvelope<TData>;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json };
}

export async function sendOtp(params: {
  email: string;
  purpose?: string;
}): Promise<SendOtpResult> {
  const email = params.email.trim().toLowerCase();
  const purpose = params.purpose;

  const { ok, status, json } = await postHasura<{ sendOtp?: SendOtpResult }>(
    `
      mutation SendOtp($email: String!, $purpose: String) {
        sendOtp(email: $email, purpose: $purpose) {
          success
          message
          expiresAt
        }
      }
    `,
    { email, purpose }
  );

  const errorMessage =
    json?.errors?.[0]?.message ??
    (!ok ? `Request failed (HTTP ${status})` : null);
  if (errorMessage) return { success: false, message: errorMessage };

  return json?.data?.sendOtp ?? { success: false, message: "Unknown error." };
}

export async function verifyOtp(params: {
  email: string;
  otp: string;
  purpose?: string;
}): Promise<VerifyOtpResult> {
  const email = params.email.trim().toLowerCase();
  const otp = params.otp.trim();
  const purpose = params.purpose;

  const { ok, status, json } = await postHasura<{ verifyOtp?: VerifyOtpResult }>(
    `
      mutation VerifyOtp($email: String!, $otp: String!, $purpose: String) {
        verifyOtp(email: $email, otp: $otp, purpose: $purpose) {
          success
          message
        }
      }
    `,
    { email, otp, purpose }
  );

  const errorMessage =
    json?.errors?.[0]?.message ??
    (!ok ? `Request failed (HTTP ${status})` : null);
  if (errorMessage) return { success: false, message: errorMessage };

  return json?.data?.verifyOtp ?? { success: false, message: "Unknown error." };
}

