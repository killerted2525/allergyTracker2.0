import express, { type Express, type RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from "@shared/schema";
import { randomUUID } from "crypto";

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Require SESSION_SECRET in production
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-only',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  }));

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body) as RegisterInput;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const userId = randomUUID();
      await storage.createUser({
        id: userId,
        username: validatedData.username,
        passwordHash,
      });

      // Regenerate session to prevent fixation
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Session creation failed" });
        }
        // Set session
        (req.session as any).userId = userId;
        req.session.save((err) => {
          if (err) {
            return res.status(500).json({ message: "Session save failed" });
          }
          res.json({ success: true });
        });
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body) as LoginInput;
      
      // Find user
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check password
      const passwordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Regenerate session to prevent fixation
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Session creation failed" });
        }
        // Set session
        (req.session as any).userId = user.id;
        req.session.save((err) => {
          if (err) {
            return res.status(500).json({ message: "Session save failed" });
          }
          res.json({ success: true, user: { id: user.id, username: user.username } });
        });
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ id: user.id, username: user.username });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Helper to get user ID from request
export function getUserId(req: express.Request): string {
  return (req.session as any).userId;
}
