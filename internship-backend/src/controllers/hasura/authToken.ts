import * as jwt from "jsonwebtoken";

type HasuraTokenInput = {
  userId: number;
  uid: string;
  isGuest: boolean;
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
      "https://hasura.io/jwt/claims": {
        "x-hasura-default-role": defaultRole,
        "x-hasura-allowed-roles": allowedRoles,
        "x-hasura-user-id": String(input.userId),
        "x-hasura-firebase-uid": String(input.uid),
      },
    },
    hasuraJwtSecret,
    { expiresIn: "1h" }
  );
}
