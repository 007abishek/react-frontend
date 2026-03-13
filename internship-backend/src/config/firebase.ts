import * as admin from "firebase-admin";

// Only initialize once
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const hasServiceAccount =
    Boolean(projectId) &&
    Boolean(clientEmail) &&
    Boolean(privateKey) &&
    privateKey!.includes("BEGIN PRIVATE KEY");

  try {
    if (hasServiceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("Firebase Admin ready (service account)");
    } else {
      // Local/dev fallback: keep server bootable when .env still has placeholders.
      admin.initializeApp();
      console.warn(
        "Firebase Admin started without service account. Auth verification may fail until FIREBASE_* env vars are set."
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    admin.initializeApp();
    console.warn(
      "Firebase credentials are invalid in non-production; started with default app. Update FIREBASE_* env vars."
    );
  }
}

export default admin;
export {};
