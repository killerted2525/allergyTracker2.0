import { 
  foods, 
  scheduleEntries, 
  users,
  type Food, 
  type InsertFood, 
  type ScheduleEntry, 
  type InsertScheduleEntry,
  type User
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: { id: string; username: string; passwordHash: string }): Promise<User>;

  // Food operations (now require userId)
  getFoods(userId: string): Promise<Food[]>;
  getFood(id: number, userId: string): Promise<Food | undefined>;
  createFood(food: InsertFood, userId: string): Promise<Food>;
  updateFood(id: number, food: Partial<InsertFood>, userId: string): Promise<Food | undefined>;
  deleteFood(id: number, userId: string): Promise<boolean>;

  // Schedule operations (now require userId)
  getScheduleEntries(userId: string, date?: string): Promise<ScheduleEntry[]>;
  getScheduleEntriesForDateRange(userId: string, startDate: string, endDate: string): Promise<ScheduleEntry[]>;
  createScheduleEntry(entry: InsertScheduleEntry, userId: string): Promise<ScheduleEntry>;
  updateScheduleEntry(id: number, entry: Partial<InsertScheduleEntry>, userId: string): Promise<ScheduleEntry | undefined>;
  deleteScheduleEntry(id: number, userId: string): Promise<boolean>;
  deleteScheduleEntriesForFood(foodId: number, userId: string): Promise<void>;
  deleteScheduleEntriesForDate(date: string, userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private foods: Map<number, Food>;
  private scheduleEntries: Map<number, ScheduleEntry>;
  private currentFoodId: number;
  private currentScheduleId: number;

  constructor() {
    this.users = new Map();
    this.foods = new Map();
    this.scheduleEntries = new Map();
    this.currentFoodId = 1;
    this.currentScheduleId = 1;
  }

  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(userData: { id: string; username: string; passwordHash: string }): Promise<User> {
    const user: User = {
      id: userData.id,
      username: userData.username,
      passwordHash: userData.passwordHash,
      createdAt: new Date(),
    };
    this.users.set(userData.id, user);
    return user;
  }

  // Food operations
  async getFoods(userId: string): Promise<Food[]> {
    return Array.from(this.foods.values()).filter(food => food.isActive && food.userId === userId);
  }

  async getFood(id: number, userId: string): Promise<Food | undefined> {
    const food = this.foods.get(id);
    return food?.userId === userId ? food : undefined;
  }

  async createFood(insertFood: InsertFood, userId: string): Promise<Food> {
    const id = this.currentFoodId++;
    const food: Food = { 
      ...insertFood,
      userId,
      id,
      isActive: true,
      mealType: insertFood.mealType ?? "any",
      startingAmount: insertFood.startingAmount ?? null,
      targetAmount: insertFood.targetAmount ?? null,
      progressionType: insertFood.progressionType ?? null,
      progressionDuration: insertFood.progressionDuration ?? null,
      startTime: insertFood.startTime ?? null,
      endTime: insertFood.endTime ?? null,
      timeProgression: insertFood.timeProgression ?? null,
      timeProgressionAmount: insertFood.timeProgressionAmount ?? null
    };
    this.foods.set(id, food);
    return food;
  }

  async updateFood(id: number, updateFood: Partial<InsertFood>, userId: string): Promise<Food | undefined> {
    const food = this.foods.get(id);
    if (!food || food.userId !== userId) return undefined;

    const updatedFood: Food = { ...food, ...updateFood };
    this.foods.set(id, updatedFood);
    return updatedFood;
  }

  async deleteFood(id: number, userId: string): Promise<boolean> {
    const food = this.foods.get(id);
    if (!food || food.userId !== userId) return false;

    // Soft delete
    const updatedFood: Food = { ...food, isActive: false };
    this.foods.set(id, updatedFood);
    
    // Remove all schedule entries for this food
    await this.deleteScheduleEntriesForFood(id, userId);
    return true;
  }

  // Schedule operations
  async getScheduleEntries(userId: string, date?: string): Promise<ScheduleEntry[]> {
    const entries = Array.from(this.scheduleEntries.values()).filter(e => e.userId === userId);
    return date ? entries.filter(entry => entry.date === date) : entries;
  }

  async getScheduleEntriesForDateRange(userId: string, startDate: string, endDate: string): Promise<ScheduleEntry[]> {
    return Array.from(this.scheduleEntries.values()).filter((entry: ScheduleEntry) => {
      return entry.userId === userId && entry.date >= startDate && entry.date <= endDate;
    });
  }

  async createScheduleEntry(insertEntry: InsertScheduleEntry, userId: string): Promise<ScheduleEntry> {
    const id = this.currentScheduleId++;
    const entry: ScheduleEntry = { 
      ...insertEntry,
      userId,
      id,
      isCompleted: false,
      completedAt: insertEntry.completedAt ?? null,
      calculatedAmount: insertEntry.calculatedAmount ?? null,
      calculatedTime: insertEntry.calculatedTime ?? null,
      occurrenceNumber: insertEntry.occurrenceNumber ?? null
    };
    this.scheduleEntries.set(id, entry);
    return entry;
  }

  async updateScheduleEntry(id: number, updateEntry: Partial<InsertScheduleEntry>, userId: string): Promise<ScheduleEntry | undefined> {
    const entry = this.scheduleEntries.get(id);
    if (!entry || entry.userId !== userId) return undefined;

    const updatedEntry: ScheduleEntry = { ...entry, ...updateEntry };
    this.scheduleEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteScheduleEntry(id: number, userId: string): Promise<boolean> {
    const entry = this.scheduleEntries.get(id);
    if (!entry || entry.userId !== userId) return false;
    return this.scheduleEntries.delete(id);
  }

  async deleteScheduleEntriesForFood(foodId: number, userId: string): Promise<void> {
    const entriesToDelete = Array.from(this.scheduleEntries.entries())
      .filter(([id, entry]) => entry.foodId === foodId && entry.userId === userId)
      .map(([id]) => id);
    
    entriesToDelete.forEach(id => this.scheduleEntries.delete(id));
  }

  async deleteScheduleEntriesForDate(date: string, userId: string): Promise<void> {
    const entriesToDelete = Array.from(this.scheduleEntries.entries())
      .filter(([id, entry]) => entry.date === date && entry.userId === userId)
      .map(([id]) => id);
    
    entriesToDelete.forEach(id => this.scheduleEntries.delete(id));
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: { id: string; username: string; passwordHash: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Food operations
  async getFoods(userId: string): Promise<Food[]> {
    const result = await db.select().from(foods).where(
      and(eq(foods.isActive, true), eq(foods.userId, userId))
    );
    return result;
  }

  async getFood(id: number, userId: string): Promise<Food | undefined> {
    const [food] = await db.select().from(foods).where(
      and(eq(foods.id, id), eq(foods.userId, userId))
    );
    return food || undefined;
  }

  async createFood(insertFood: InsertFood, userId: string): Promise<Food> {
    const [food] = await db
      .insert(foods)
      .values({ ...insertFood, userId })
      .returning();
    return food;
  }

  async updateFood(id: number, updateFood: Partial<InsertFood>, userId: string): Promise<Food | undefined> {
    const [food] = await db
      .update(foods)
      .set(updateFood)
      .where(and(eq(foods.id, id), eq(foods.userId, userId)))
      .returning();
    return food || undefined;
  }

  async deleteFood(id: number, userId: string): Promise<boolean> {
    // Soft delete
    const [food] = await db
      .update(foods)
      .set({ isActive: false })
      .where(and(eq(foods.id, id), eq(foods.userId, userId)))
      .returning();
    
    if (food) {
      // Remove all schedule entries for this food
      await this.deleteScheduleEntriesForFood(id, userId);
      return true;
    }
    return false;
  }

  async getScheduleEntries(userId: string, date?: string): Promise<ScheduleEntry[]> {
    if (date) {
      return await db.select().from(scheduleEntries).where(
        and(eq(scheduleEntries.date, date), eq(scheduleEntries.userId, userId))
      );
    }
    return await db.select().from(scheduleEntries).where(eq(scheduleEntries.userId, userId));
  }

  async getScheduleEntriesForDateRange(userId: string, startDate: string, endDate: string): Promise<ScheduleEntry[]> {
    const result = await db.select().from(scheduleEntries).where(eq(scheduleEntries.userId, userId));
    return result.filter((entry: ScheduleEntry) => entry.date >= startDate && entry.date <= endDate);
  }

  async createScheduleEntry(insertEntry: InsertScheduleEntry, userId: string): Promise<ScheduleEntry> {
    const [entry] = await db
      .insert(scheduleEntries)
      .values({ ...insertEntry, userId })
      .returning();
    return entry;
  }

  async updateScheduleEntry(id: number, updateEntry: Partial<InsertScheduleEntry>, userId: string): Promise<ScheduleEntry | undefined> {
    const [entry] = await db
      .update(scheduleEntries)
      .set(updateEntry)
      .where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.userId, userId)))
      .returning();
    return entry || undefined;
  }

  async deleteScheduleEntry(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(scheduleEntries).where(
      and(eq(scheduleEntries.id, id), eq(scheduleEntries.userId, userId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteScheduleEntriesForFood(foodId: number, userId: string): Promise<void> {
    await db.delete(scheduleEntries).where(
      and(eq(scheduleEntries.foodId, foodId), eq(scheduleEntries.userId, userId))
    );
  }

  async deleteScheduleEntriesForDate(date: string, userId: string): Promise<void> {
    await db.delete(scheduleEntries).where(
      and(eq(scheduleEntries.date, date), eq(scheduleEntries.userId, userId))
    );
  }
}

// Use DatabaseStorage if DATABASE_URL is available, otherwise use MemStorage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
