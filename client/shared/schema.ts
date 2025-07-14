import { pgTable, text, serial, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  color: text("color").notNull(),
  frequency: text("frequency").notNull(), // Custom frequency like "every 2 days", "3 times per week", etc.
  startDate: date("start_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  mealType: text("meal_type", { enum: ["breakfast", "lunch", "dinner", "snack", "any"] }).default("any"),
});

export const scheduleEntries = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  foodId: integer("food_id").notNull().references(() => foods.id),
  date: date("date").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: text("completed_at"), // ISO timestamp when completed
});

export const insertFoodSchema = createInsertSchema(foods).omit({
  id: true,
  isActive: true,
});

export const insertScheduleEntrySchema = createInsertSchema(scheduleEntries).omit({
  id: true,
});

export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foods.$inferSelect;
export type InsertScheduleEntry = z.infer<typeof insertScheduleEntrySchema>;
export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
