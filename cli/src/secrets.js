import axios from "axios";
import crypto from "crypto";
import enquirer from "enquirer";

let PUBLIC_KEY = null;

async function loadPublicKey() {
  // Cache the key so that we only ask for the hostname on the first use
  if (PUBLIC_KEY) {
    return PUBLIC_KEY;
  }

  const { hostname } = await enquirer.prompt({
    name: "hostname",
    type: "input",
    message: "What is the hostname of your Flakeaway server?",
    validate: async (hostname) => {
      // Test whether we can access the API at the given hostname
      try {
        await axios.get(`https://${hostname}/api/secrets_public_key`);
      } catch {
        return false;
      }
      return true;
    },
  });

  const response = await axios.get(`https://${hostname}/api/secrets_public_key`);
  PUBLIC_KEY = response.data;
  return PUBLIC_KEY;
}

export async function encryptSecret(secret) {
  console.log("⬆ This will be encrypted so that only your Flakeaway server can read it.");

  const secretBuffer = Buffer.from(secret);

  const encryptedBuffer = crypto.publicEncrypt(
    {
      key: await loadPublicKey(),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    secretBuffer
  );

  return encryptedBuffer.toString("base64");
}
