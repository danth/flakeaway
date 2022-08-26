import { GitHub } from "./forges/github.js";

export async function deserializeForge(serialized) {
  if (serialized.type == "github") {
    return await GitHub.deserialize(serialized);
  }

  throw "Unknown forge type ${serialized}";
}
