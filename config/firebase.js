import admin from "firebase-admin";
import serviceAccount from "./firebase.json" assert { type: "json" }; // Importing with assert for JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const messaging = admin.messaging();
