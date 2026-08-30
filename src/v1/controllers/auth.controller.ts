import { Context } from "hono";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { authdb } from "../services/db/auth.db";
import { getJwtSecret } from "../utils/keys";

export const authController = {
  login: async (c: Context) => {
    try {
      const { username, password } = await c.req.json();
      if (!username) return c.json({ message: "User name is required." }, 400);
      if (!password) return c.json({ message: "Password is required." }, 400);

      const user = await authdb.getUserByUsername(c.env.DB, username);
      const isMatch = user?.password ? await bcrypt.compare(password, user.password) : false;
      if (!user || !isMatch) {
        return c.json({ message: "Invalid credentials" }, 401);
      }

      if (user.status === "suspended") {
        return c.json({ message: "Account is suspended. Please contact your system administrator." }, 403);
      }

      await authdb.updateLastLogin(c.env.DB, username);

      const role = user.role || "client_admin";
      const clientId = user.client_id || null;

      const jwtSecretStr = getJwtSecret(c.env);
      const jwtSecret = new TextEncoder().encode(jwtSecretStr);
      const token = await new SignJWT({
        id: user.id,
        username: user.username,
        role: role,
        clientId: clientId,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(jwtSecret);

      return c.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: role,
          clientId: clientId,
        },
      });
    } catch (error: any) {
      console.error("Auth login error:", error?.message || error);
      return c.json({ message: "Internal Server Error." }, 500);
    }
  },

  signup: async (c: Context) => {
    try {
      const { username, password, role = "client_admin", clientId = null } = await c.req.json();
      if (!username) return c.json({ message: "User name is required." }, 400);
      if (!password) return c.json({ message: "Password is required." }, 400);

      const existingUser = await authdb.getUserByUsername(c.env.DB, username);
      if (existingUser) {
        return c.json({ message: "Username already exists." }, 409);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await authdb.saveUser(c.env.DB, username, hashedPassword, role, clientId);

      return c.json({ message: "User registered successfully!" }, 201);
    } catch (error: any) {
      console.error("Auth signup error:", error?.message || error);
      return c.json({ message: "Internal Server Error." }, 500);
    }
  },

  getUserById: async (c: Context) => {
    try {
      const userId = c.req.param("id");
      if (!userId) return c.json({ message: "User ID is required." }, 400);

      const user = await authdb.getUserById(c.env.DB, userId);
      if (!user) return c.json({ message: "User not found." }, 404);

      return c.json({ user, data: user });
    } catch (error: any) {
      console.error("Auth getUserById error:", error?.message || error);
      return c.json({ message: "Internal Server Error." }, 500);
    }
  },

  getAllUsers: async (c: Context) => {
    try {
      const users = await authdb.getAllAuthUsers(c.env.DB);
      return c.json({ users });
    } catch (error: any) {
      console.error("Auth getAllUsers error:", error?.message || error);
      return c.json({ message: "Internal Server Error." }, 500);
    }
  },
};
