import { MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import { getJwtSecret } from "../utils/keys";

export const auth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const jwtSecretStr = getJwtSecret(c.env);
    const jwtSecret = new TextEncoder().encode(jwtSecretStr);
    const { payload } = await jwtVerify(token, jwtSecret);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ message: "Invalid or expired token" }, 401);
  }
};
