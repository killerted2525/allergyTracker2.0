import { sql } from 'drizzle-orm';
import { pgTable, text, serial, integer, boolean, date, varchar, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  color: text("color").notNull(),
  frequency: text("frequency").notNull(), // Custom frequency like "every 2 days", "3 times per week", etc.
  startDate: date("start_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner", "snack", "any"] }).default("any"),
  // Dose progression settings
  startingAmount: text("starting_amount"),
  targetAmount: text("target_amount"),
  progressionType: text("progression_type"), // 'buildup', 'static', 'reduction', 'custom'
  progressionDuration: integer("progression_duration"), // days to reach target
  // Time scheduling settings
  startTime: text("start_time"), // HH:MM format
  endTime: text("end_time"), // HH:MM format
  timeProgression: text("time_progression"), // 'later', 'earlier', 'static'
  timeProgressionAmount: integer("time_progression_amount"), // minutes to adjust per occurrence
});

export const scheduleEntries = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  foodId: integer("food_id").notNull().references(() => foods.id),
  date: date("date").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: text("completed_at"), // ISO timestamp when completed
  // Calculated values for this specific entry
  calculatedAmount: text("calculated_amount"), // Amount for this specific day/occurrence
  calculatedTime: text("calculated_time"), // Time for this specific day/occurrence (HH:MM)
  occurrenceNumber: integer("occurrence_number"), // Which occurrence this is (for progression calculations)
});

export const insertFoodSchema = createInsertSchema(foods).omit({
  id: true,
  isActive: true,
  userId: true, // Will be added by the server from session
});

export const insertScheduleEntrySchema = createInsertSchema(scheduleEntries).omit({
  id: true,
  userId: true, // Will be added by the server from session
});

// Auth schemas
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foods.$inferSelect;
export type InsertScheduleEntry = z.infer<typeof insertScheduleEntrySchema>;
export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
