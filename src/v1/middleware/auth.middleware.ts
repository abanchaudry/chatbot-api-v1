import { MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";

export const auth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    if (!c.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return c.json({ message: "Authentication is not configured" }, 500);
    }

    const jwtSecret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, jwtSecret);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ message: "Invalid or expired token" }, 401);
  }
};
