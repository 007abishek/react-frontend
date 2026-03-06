import * as jwt from "jsonwebtoken";

export type HasuraTokenInput = {
  userId: number;
  uid: string;
  isGuest: boolean;
  email?: string | null;
  provider?: string;
  expiresIn?: jwt.SignOptions["expiresIn"];
};

export function signHasuraToken(input: HasuraTokenInput): string {
  const hasuraJwtSecret = process.env.HASURA_JWT_SECRET;
  if (!hasuraJwtSecret) {
    throw new Error("HASURA_JWT_SECRET is not configured");
  }

  const defaultRole = input.isGuest ? "guest" : "user";
  const allowedRoles = input.isGuest ? ["guest"] : ["user"];

  return jwt.sign(
    {
      sub: String(input.uid),
      userId: Number(input.userId),
      uid: String(input.uid),
      email: input.email ?? null,
      provider: input.provider ?? (input.isGuest ? "guest" : "password"),
      isGuest: Boolean(input.isGuest),
      "https://hasura.io/jwt/claims": {
        "x-hasura-default-role": defaultRole,
        "x-hasura-allowed-roles": allowedRoles,
        "x-hasura-user-id": String(input.userId),
        "x-hasura-firebase-uid": String(input.uid),
      },
    },
    hasuraJwtSecret,
    { expiresIn: input.expiresIn ?? ("7d" as jwt.SignOptions["expiresIn"]) }
  );
}
