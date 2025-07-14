import { foods, scheduleEntries, type Food, type InsertFood, type ScheduleEntry, type InsertScheduleEntry } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Food operations
  getFoods(): Promise<Food[]>;
  getFood(id: number): Promise<Food | undefined>;
  createFood(food: InsertFood): Promise<Food>;
  updateFood(id: number, food: Partial<InsertFood>): Promise<Food | undefined>;
  deleteFood(id: number): Promise<boolean>;

  // Schedule operations
  getScheduleEntries(date?: string): Promise<ScheduleEntry[]>;
  getScheduleEntriesForDateRange(startDate: string, endDate: string): Promise<ScheduleEntry[]>;
  createScheduleEntry(entry: InsertScheduleEntry): Promise<ScheduleEntry>;
  updateScheduleEntry(id: number, entry: Partial<InsertScheduleEntry>): Promise<ScheduleEntry | undefined>;
  deleteScheduleEntry(id: number): Promise<boolean>;
  deleteScheduleEntriesForFood(foodId: number): Promise<void>;
  deleteScheduleEntriesForDate(date: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private foods: Map<number, Food>;
  private scheduleEntries: Map<number, ScheduleEntry>;
  private currentFoodId: number;
  private currentScheduleId: number;

  constructor() {
    this.foods = new Map();
    this.scheduleEntries = new Map();
    this.currentFoodId = 1;
    this.currentScheduleId = 1;
  }

  // Food operations
  async getFoods(): Promise<Food[]> {
    return Array.from(this.foods.values()).filter(food => food.isActive);
  }

  async getFood(id: number): Promise<Food | undefined> {
    return this.foods.get(id);
  }

  async createFood(insertFood: InsertFood): Promise<Food> {
    const id = this.currentFoodId++;
    const food: Food = { 
      ...insertFood, 
      id,
      isActive: true 
    };
    this.foods.set(id, food);
    return food;
  }

  async updateFood(id: number, updateFood: Partial<InsertFood>): Promise<Food | undefined> {
    const food = this.foods.get(id);
    if (!food) return undefined;

    const updatedFood: Food = { ...food, ...updateFood };
    this.foods.set(id, updatedFood);
    return updatedFood;
  }

  async deleteFood(id: number): Promise<boolean> {
    const food = this.foods.get(id);
    if (!food) return false;

    // Soft delete
    const updatedFood: Food = { ...food, isActive: false };
    this.foods.set(id, updatedFood);
    
    // Remove all schedule entries for this food
    await this.deleteScheduleEntriesForFood(id);
    return true;
  }

  // Schedule operations
  async getScheduleEntries(date?: string): Promise<ScheduleEntry[]> {
    const entries = Array.from(this.scheduleEntries.values());
    return date ? entries.filter(entry => entry.date === date) : entries;
  }

  async getScheduleEntriesForDateRange(startDate: string, endDate: string): Promise<ScheduleEntry[]> {
    return Array.from(this.scheduleEntries.values()).filter(entry => {
      return entry.date >= startDate && entry.date <= endDate;
    });
  }

  async createScheduleEntry(insertEntry: InsertScheduleEntry): Promise<ScheduleEntry> {
    const id = this.currentScheduleId++;
    const entry: ScheduleEntry = { 
      ...insertEntry, 
      id,
      isCompleted: false 
    };
    this.scheduleEntries.set(id, entry);
    return entry;
  }

  async updateScheduleEntry(id: number, updateEntry: Partial<InsertScheduleEntry>): Promise<ScheduleEntry | undefined> {
    const entry = this.scheduleEntries.get(id);
    if (!entry) return undefined;

    const updatedEntry: ScheduleEntry = { ...entry, ...updateEntry };
    this.scheduleEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteScheduleEntry(id: number): Promise<boolean> {
    return this.scheduleEntries.delete(id);
  }

  async deleteScheduleEntriesForFood(foodId: number): Promise<void> {
    const entriesToDelete = Array.from(this.scheduleEntries.entries())
      .filter(([id, entry]) => entry.foodId === foodId)
      .map(([id]) => id);
    
    entriesToDelete.forEach(id => this.scheduleEntries.delete(id));
  }

  async deleteScheduleEntriesForDate(date: string): Promise<void> {
    const entriesToDelete = Array.from(this.scheduleEntries.entries())
      .filter(([id, entry]) => entry.date === date)
      .map(([id]) => id);
    
    entriesToDelete.forEach(id => this.scheduleEntries.delete(id));
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getFoods(): Promise<Food[]> {
    const result = await db.select().from(foods).where(eq(foods.isActive, true));
    return result;
  }

  async getFood(id: number): Promise<Food | undefined> {
    const [food] = await db.select().from(foods).where(eq(foods.id, id));
    return food || undefined;
  }

  async createFood(insertFood: InsertFood): Promise<Food> {
    const [food] = await db
      .insert(foods)
      .values(insertFood)
      .returning();
    return food;
  }

  async updateFood(id: number, updateFood: Partial<InsertFood>): Promise<Food | undefined> {
    const [food] = await db
      .update(foods)
      .set(updateFood)
      .where(eq(foods.id, id))
      .returning();
    return food || undefined;
  }

  async deleteFood(id: number): Promise<boolean> {
    // Soft delete
    const [food] = await db
      .update(foods)
      .set({ isActive: false })
      .where(eq(foods.id, id))
      .returning();
    
    if (food) {
      // Remove all schedule entries for this food
      await this.deleteScheduleEntriesForFood(id);
      return true;
    }
    return false;
  }

  async getScheduleEntries(date?: string): Promise<ScheduleEntry[]> {
    if (date) {
      return await db.select().from(scheduleEntries).where(eq(scheduleEntries.date, date));
    }
    return await db.select().from(scheduleEntries);
  }

  async getScheduleEntriesForDateRange(startDate: string, endDate: string): Promise<ScheduleEntry[]> {
    const result = await db.select().from(scheduleEntries);
    return result.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }

  async createScheduleEntry(insertEntry: InsertScheduleEntry): Promise<ScheduleEntry> {
    const [entry] = await db
      .insert(scheduleEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async updateScheduleEntry(id: number, updateEntry: Partial<InsertScheduleEntry>): Promise<ScheduleEntry | undefined> {
    const [entry] = await db
      .update(scheduleEntries)
      .set(updateEntry)
      .where(eq(scheduleEntries.id, id))
      .returning();
    return entry || undefined;
  }

  async deleteScheduleEntry(id: number): Promise<boolean> {
    const result = await db.delete(scheduleEntries).where(eq(scheduleEntries.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteScheduleEntriesForFood(foodId: number): Promise<void> {
    await db.delete(scheduleEntries).where(eq(scheduleEntries.foodId, foodId));
  }

  async deleteScheduleEntriesForDate(date: string): Promise<void> {
    await db.delete(scheduleEntries).where(eq(scheduleEntries.date, date));
  }
}

export const storage = new DatabaseStorage();
