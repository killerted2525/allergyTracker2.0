var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  foods: () => foods,
  insertFoodSchema: () => insertFoodSchema,
  insertScheduleEntrySchema: () => insertScheduleEntrySchema,
  scheduleEntries: () => scheduleEntries
});
import { pgTable, text, serial, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  color: text("color").notNull(),
  frequency: text("frequency").notNull(),
  // Custom frequency like "every 2 days", "3 times per week", etc.
  startDate: date("start_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner", "snack", "any"] }).default("any")
});
var scheduleEntries = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  foodId: integer("food_id").notNull().references(() => foods.id),
  date: date("date").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: text("completed_at")
  // ISO timestamp when completed
});
var insertFoodSchema = createInsertSchema(foods).omit({
  id: true,
  isActive: true
});
var insertScheduleEntrySchema = createInsertSchema(scheduleEntries).omit({
  id: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
if (process.env.NODE_ENV !== "production") {
  neonConfig.webSocketConstructor = ws;
}
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
var DatabaseStorage = class {
  async getFoods() {
    const result = await db.select().from(foods).where(eq(foods.isActive, true));
    return result;
  }
  async getFood(id) {
    const [food] = await db.select().from(foods).where(eq(foods.id, id));
    return food || void 0;
  }
  async createFood(insertFood) {
    const [food] = await db.insert(foods).values(insertFood).returning();
    return food;
  }
  async updateFood(id, updateFood) {
    const [food] = await db.update(foods).set(updateFood).where(eq(foods.id, id)).returning();
    return food || void 0;
  }
  async deleteFood(id) {
    const [food] = await db.update(foods).set({ isActive: false }).where(eq(foods.id, id)).returning();
    if (food) {
      await this.deleteScheduleEntriesForFood(id);
      return true;
    }
    return false;
  }
  async getScheduleEntries(date2) {
    if (date2) {
      return await db.select().from(scheduleEntries).where(eq(scheduleEntries.date, date2));
    }
    return await db.select().from(scheduleEntries);
  }
  async getScheduleEntriesForDateRange(startDate, endDate) {
    const result = await db.select().from(scheduleEntries);
    return result.filter((entry) => entry.date >= startDate && entry.date <= endDate);
  }
  async createScheduleEntry(insertEntry) {
    const [entry] = await db.insert(scheduleEntries).values(insertEntry).returning();
    return entry;
  }
  async updateScheduleEntry(id, updateEntry) {
    const [entry] = await db.update(scheduleEntries).set(updateEntry).where(eq(scheduleEntries.id, id)).returning();
    return entry || void 0;
  }
  async deleteScheduleEntry(id) {
    const result = await db.delete(scheduleEntries).where(eq(scheduleEntries.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async deleteScheduleEntriesForFood(foodId) {
    await db.delete(scheduleEntries).where(eq(scheduleEntries.foodId, foodId));
  }
  async deleteScheduleEntriesForDate(date2) {
    await db.delete(scheduleEntries).where(eq(scheduleEntries.date, date2));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
function generateScheduleEntries(food, startDateStr, endDateStr) {
  const entries = [];
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const frequency = food.frequency.toLowerCase();
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    let shouldInclude = false;
    if (frequency === "daily" || frequency === "every day") {
      shouldInclude = true;
    } else if (frequency === "weekly" || frequency === "once a week") {
      shouldInclude = currentDate.getDay() === startDate.getDay();
    } else if (frequency.includes("times per week") || frequency.includes("x week") || frequency.includes("times a week")) {
      const timesMatch = frequency.match(/(\d+)/);
      const times = timesMatch ? parseInt(timesMatch[1]) : 3;
      if (times === 7) {
        shouldInclude = true;
      } else if (times === 6) {
        shouldInclude = currentDate.getDay() !== 0;
      } else if (times === 5) {
        shouldInclude = [1, 2, 3, 4, 5].includes(currentDate.getDay());
      } else if (times === 4) {
        shouldInclude = [1, 2, 4, 5].includes(currentDate.getDay());
      } else if (times === 3) {
        shouldInclude = [1, 3, 5].includes(currentDate.getDay());
      } else if (times === 2) {
        shouldInclude = [2, 5].includes(currentDate.getDay());
      } else if (times === 1) {
        shouldInclude = currentDate.getDay() === startDate.getDay();
      }
    } else if (frequency.includes("every 2 days") || frequency.includes("every other day")) {
      const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (1e3 * 60 * 60 * 24));
      shouldInclude = daysDiff % 2 === 0;
    } else {
      shouldInclude = true;
    }
    if (shouldInclude) {
      entries.push({
        foodId: food.id,
        date: currentDate.toISOString().split("T")[0]
        // YYYY-MM-DD format
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return entries;
}
async function registerRoutes(app2) {
  app2.get("/api/foods", async (req, res) => {
    try {
      const foods2 = await storage.getFoods();
      res.json(foods2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch foods" });
    }
  });
  app2.post("/api/foods", async (req, res) => {
    try {
      const validatedData = insertFoodSchema.parse(req.body);
      const food = await storage.createFood(validatedData);
      res.status(201).json(food);
    } catch (error) {
      res.status(400).json({ message: "Invalid food data" });
    }
  });
  app2.patch("/api/foods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = insertFoodSchema.partial().parse(req.body);
      const food = await storage.updateFood(id, partialData);
      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }
      res.json(food);
    } catch (error) {
      res.status(400).json({ message: "Invalid food data" });
    }
  });
  app2.delete("/api/foods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFood(id);
      if (!success) {
        return res.status(404).json({ message: "Food not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete food" });
    }
  });
  app2.get("/api/schedule", async (req, res) => {
    try {
      const { startDate, endDate, date: date2 } = req.query;
      let entries;
      if (startDate && endDate) {
        entries = await storage.getScheduleEntriesForDateRange(
          startDate,
          endDate
        );
      } else {
        entries = await storage.getScheduleEntries(date2);
      }
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule entries" });
    }
  });
  app2.post("/api/schedule", async (req, res) => {
    try {
      const validatedData = insertScheduleEntrySchema.parse(req.body);
      const entry = await storage.createScheduleEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule entry data" });
    }
  });
  app2.patch("/api/schedule/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = insertScheduleEntrySchema.partial().parse(req.body);
      const entry = await storage.updateScheduleEntry(id, partialData);
      if (!entry) {
        return res.status(404).json({ message: "Schedule entry not found" });
      }
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule entry data" });
    }
  });
  app2.delete("/api/schedule/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteScheduleEntry(id);
      if (!success) {
        return res.status(404).json({ message: "Schedule entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schedule entry" });
    }
  });
  app2.post("/api/foods/:id/generate-schedule", async (req, res) => {
    try {
      const foodId = parseInt(req.params.id);
      const { startDate, endDate } = req.body;
      const food = await storage.getFood(foodId);
      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }
      const entries = generateScheduleEntries(food, startDate, endDate);
      const createdEntries = [];
      for (const entry of entries) {
        try {
          const created = await storage.createScheduleEntry(entry);
          createdEntries.push(created);
        } catch (error) {
          console.log(`Skipping duplicate entry for ${entry.date}`);
        }
      }
      res.json({ created: createdEntries.length, entries: createdEntries });
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule" });
    }
  });
  app2.get("/api/calendar/subscribe", async (req, res) => {
    try {
      const foods2 = await storage.getFoods();
      const activeFoods = foods2.filter((food) => food.isActive);
      let icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AllergyTracker//Food Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Food Schedule (Live)",
        "X-WR-CALDESC:Your personalized food allergy schedule - automatically updates",
        "X-PUBLISHED-TTL:PT1H",
        // Refresh every hour
        "REFRESH-INTERVAL;VALUE=DURATION:PT1H"
      ];
      const formatDateForICS = (date2) => {
        return date2.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };
      activeFoods.forEach((food) => {
        const recurringRule = getRecurringRule(food.frequency);
        const foodStartDate = /* @__PURE__ */ new Date(food.startDate + "T09:00:00");
        const foodEndDate = /* @__PURE__ */ new Date(food.startDate + "T09:30:00");
        icsContent.push(
          "BEGIN:VEVENT",
          `UID:food-${food.id}-live@allergytracker.app`,
          `DTSTAMP:${formatDateForICS(/* @__PURE__ */ new Date())}`,
          `DTSTART:${formatDateForICS(foodStartDate)}`,
          `DTEND:${formatDateForICS(foodEndDate)}`,
          `SUMMARY:\u{1F34E} ${food.name}`,
          `DESCRIPTION:${food.instructions}\\nFrequency: ${food.frequency}\\n\\nThis event updates automatically when you modify your food schedule.`,
          `CATEGORIES:Health,Food,Allergy`,
          "STATUS:CONFIRMED",
          "TRANSP:TRANSPARENT",
          ...recurringRule ? [`RRULE:${recurringRule}`] : [],
          "END:VEVENT"
        );
      });
      icsContent.push("END:VCALENDAR");
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.send(icsContent.join("\r\n"));
    } catch (error) {
      res.status(500).json({ message: "Failed to generate calendar subscription" });
    }
  });
  app2.get("/api/calendar/export", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      const entries = await storage.getScheduleEntriesForDateRange(
        startDate,
        endDate
      );
      const foods2 = await storage.getFoods();
      const foodMap = new Map(foods2.map((food) => [food.id, food]));
      let icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AllergyTracker//Food Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Food Schedule",
        "X-WR-CALDESC:Your personalized food allergy schedule"
      ];
      const processedFoods = /* @__PURE__ */ new Set();
      const formatDateForICS = (date2) => {
        return date2.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };
      entries.forEach((entry) => {
        const food = foodMap.get(entry.foodId);
        if (!food || processedFoods.has(food.id)) return;
        processedFoods.add(food.id);
        const recurringRule = getRecurringRule(food.frequency);
        const foodStartDate = /* @__PURE__ */ new Date(food.startDate + "T09:00:00");
        const foodEndDate = /* @__PURE__ */ new Date(food.startDate + "T09:30:00");
        icsContent.push(
          "BEGIN:VEVENT",
          `UID:food-${food.id}-recurring@allergytracker.app`,
          `DTSTAMP:${formatDateForICS(/* @__PURE__ */ new Date())}`,
          `DTSTART:${formatDateForICS(foodStartDate)}`,
          `DTEND:${formatDateForICS(foodEndDate)}`,
          `SUMMARY:\u{1F34E} ${food.name}`,
          `DESCRIPTION:${food.instructions}\\nFrequency: ${food.frequency}\\n\\nThis is a recurring event that will automatically continue. Update your food schedule in the app to modify or cancel.`,
          `CATEGORIES:Health,Food,Allergy`,
          "STATUS:CONFIRMED",
          "TRANSP:TRANSPARENT",
          ...recurringRule ? [`RRULE:${recurringRule}`] : [],
          "END:VEVENT"
        );
      });
      icsContent.push("END:VCALENDAR");
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="food-schedule.ics"');
      res.send(icsContent.join("\r\n"));
    } catch (error) {
      res.status(500).json({ message: "Failed to generate calendar export" });
    }
  });
  app2.delete("/api/schedule/date/:date", async (req, res) => {
    try {
      const date2 = req.params.date;
      await storage.deleteScheduleEntriesForDate(date2);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear schedule entries for date" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ limit: "50mb", extended: true }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
