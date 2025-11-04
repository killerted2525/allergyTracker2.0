import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodSchema, insertScheduleEntrySchema, type Food } from "@shared/schema";
import { setupAuth, isAuthenticated, getUserId } from "./auth/index";

// Utility functions for dose and time calculations
function calculateProgressiveAmount(
  startingAmount: string | null,
  targetAmount: string | null,
  progressionType: string | null,
  progressionDuration: number | null,
  occurrenceNumber: number,
  totalOccurrences: number
): string | null {
  if (!startingAmount || !targetAmount || !progressionType || !progressionDuration) {
    return startingAmount || null;
  }

  if (progressionType === 'static') {
    return startingAmount;
  }

  // Parse amounts (assuming format like "1 tablespoon", "0.5 teaspoon", etc.)
  const parseAmount = (amount: string) => {
    const match = amount.match(/^([\d.]+)/);
    return match ? parseFloat(match[1]) : 1;
  };

  const startValue = parseAmount(startingAmount);
  const targetValue = parseAmount(targetAmount);
  
  // Calculate progression based on occurrence number
  const progress = Math.min(occurrenceNumber / Math.max(totalOccurrences - 1, 1), 1);
  
  let currentValue: number;
  if (progressionType === 'buildup') {
    currentValue = startValue + (targetValue - startValue) * progress;
  } else if (progressionType === 'reduction') {
    currentValue = startValue - (startValue - targetValue) * progress;
  } else if (progressionType === 'custom') {
    // Custom progression with more complex patterns
    // Example: Plateau at 50% for middle third, then continue buildup
    if (progress < 0.33) {
      // First third: linear buildup to 50% target
      currentValue = startValue + (targetValue - startValue) * 0.5 * (progress / 0.33);
    } else if (progress < 0.67) {
      // Middle third: plateau at 50%
      currentValue = startValue + (targetValue - startValue) * 0.5;
    } else {
      // Final third: complete buildup to target
      const finalProgress = (progress - 0.67) / 0.33;
      currentValue = startValue + (targetValue - startValue) * (0.5 + 0.5 * finalProgress);
    }
  } else {
    currentValue = startValue;
  }

  // Replace the numeric part while keeping the unit
  return startingAmount.replace(/^[\d.]+/, currentValue.toFixed(2));
}

function calculateProgressiveTime(
  startTime: string | null,
  timeProgression: string | null,
  timeProgressionAmount: number | null,
  occurrenceNumber: number
): string | null {
  if (!startTime || !timeProgression || !timeProgressionAmount || timeProgression === 'static') {
    return startTime;
  }

  // Parse time (HH:MM format)
  const [hours, minutes] = startTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;

  // Apply progression
  if (timeProgression === 'later') {
    totalMinutes += timeProgressionAmount * occurrenceNumber;
  } else if (timeProgression === 'earlier') {
    totalMinutes -= timeProgressionAmount * occurrenceNumber;
  }

  // Wrap around 24 hour format
  totalMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);

  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

// Schedule generation utility
function generateScheduleEntries(food: Food, startDateStr: string, endDateStr: string) {
  const entries = [];
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  // Normalize frequency
  const frequency = food.frequency.toLowerCase();
  
  let currentDate = new Date(startDate);
  let occurrenceNumber = 0;
  
  // First pass: determine total occurrences for progression calculations
  const tempEntries = [];
  let tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    let shouldInclude = false;
    
    if (frequency === 'daily' || frequency === 'every day') {
      shouldInclude = true;
    } else if (frequency === 'weekly' || frequency === 'once a week') {
      shouldInclude = tempDate.getDay() === startDate.getDay();
    } else if (frequency.includes('times per week') || frequency.includes('x week') || frequency.includes('times a week')) {
      const timesMatch = frequency.match(/(\d+)/);
      const times = timesMatch ? parseInt(timesMatch[1]) : 3;
      
      if (times === 7) {
        shouldInclude = true;
      } else if (times === 6) {
        shouldInclude = tempDate.getDay() !== 0;
      } else if (times === 5) {
        shouldInclude = [1, 2, 3, 4, 5].includes(tempDate.getDay());
      } else if (times === 4) {
        shouldInclude = [1, 2, 4, 5].includes(tempDate.getDay());
      } else if (times === 3) {
        shouldInclude = [1, 3, 5].includes(tempDate.getDay());
      } else if (times === 2) {
        shouldInclude = [2, 5].includes(tempDate.getDay());
      } else if (times === 1) {
        shouldInclude = tempDate.getDay() === startDate.getDay();
      }
    } else if (frequency.includes('every 2 days') || frequency.includes('every other day')) {
      const daysDiff = Math.floor((tempDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      shouldInclude = daysDiff % 2 === 0;
    } else {
      shouldInclude = true;
    }
    
    if (shouldInclude) {
      tempEntries.push(tempDate.toISOString().split('T')[0]);
    }
    
    tempDate.setDate(tempDate.getDate() + 1);
  }
  
  const totalOccurrences = tempEntries.length;
  
  // Second pass: generate actual entries with calculated values
  while (currentDate <= endDate) {
    let shouldInclude = false;
    
    if (frequency === 'daily' || frequency === 'every day') {
      shouldInclude = true;
    } else if (frequency === 'weekly' || frequency === 'once a week') {
      shouldInclude = currentDate.getDay() === startDate.getDay();
    } else if (frequency.includes('times per week') || frequency.includes('x week') || frequency.includes('times a week')) {
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
    } else if (frequency.includes('every 2 days') || frequency.includes('every other day')) {
      const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      shouldInclude = daysDiff % 2 === 0;
    } else {
      shouldInclude = true;
    }
    
    if (shouldInclude) {
      const calculatedAmount = calculateProgressiveAmount(
        food.startingAmount,
        food.targetAmount,
        food.progressionType,
        food.progressionDuration,
        occurrenceNumber,
        totalOccurrences
      );
      
      const calculatedTime = calculateProgressiveTime(
        food.startTime,
        food.timeProgression,
        food.timeProgressionAmount,
        occurrenceNumber
      );
      
      entries.push({
        foodId: food.id,
        date: currentDate.toISOString().split('T')[0],
        calculatedAmount,
        calculatedTime,
        occurrenceNumber,
      });
      
      occurrenceNumber++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return entries;
}
export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication - auth routes are defined in auth.ts
  setupAuth(app);

  // Food routes (all protected)
  app.get("/api/foods", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const foods = await storage.getFoods(userId);
      res.json(foods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch foods" });
    }
  });

  app.post("/api/foods", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertFoodSchema.parse(req.body);
      const food = await storage.createFood(validatedData, userId);
      res.status(201).json(food);
    } catch (error) {
      res.status(400).json({ message: "Invalid food data" });
    }
  });

  app.patch("/api/foods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      const partialData = insertFoodSchema.partial().parse(req.body);
      const food = await storage.updateFood(id, partialData, userId);
      
      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }
      
      res.json(food);
    } catch (error) {
      res.status(400).json({ message: "Invalid food data" });
    }
  });

  app.delete("/api/foods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      const success = await storage.deleteFood(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Food not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete food" });
    }
  });



  // Schedule routes (all protected)
  app.get("/api/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate, date } = req.query;
      
      let entries;
      if (startDate && endDate) {
        entries = await storage.getScheduleEntriesForDateRange(
          userId,
          startDate as string, 
          endDate as string
        );
      } else {
        entries = await storage.getScheduleEntries(userId, date as string);
      }
      
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule entries" });
    }
  });

  app.post("/api/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertScheduleEntrySchema.parse(req.body);
      const entry = await storage.createScheduleEntry(validatedData, userId);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule entry data" });
    }
  });

  app.patch("/api/schedule/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      const partialData = insertScheduleEntrySchema.partial().parse(req.body);
      const entry = await storage.updateScheduleEntry(id, partialData, userId);
      
      if (!entry) {
        return res.status(404).json({ message: "Schedule entry not found" });
      }
      
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule entry data" });
    }
  });

  app.delete("/api/schedule/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      const success = await storage.deleteScheduleEntry(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Schedule entry not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schedule entry" });
    }
  });

  // Get schedule entries for a specific food
  app.get("/api/foods/:id/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const foodId = parseInt(req.params.id);
      const allEntries = await storage.getScheduleEntries(userId);
      const foodEntries = allEntries.filter(entry => entry.foodId === foodId);
      res.json(foodEntries);
    } catch (error) {
      console.error("Error getting food schedule:", error);
      res.status(500).json({ message: "Failed to get food schedule" });
    }
  });

  // Generate schedule for a food based on frequency
  app.post("/api/foods/:id/generate-schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const foodId = parseInt(req.params.id);
      const { startDate, endDate } = req.body;
      
      const food = await storage.getFood(foodId, userId);
      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }

      // Generate schedule entries based on frequency
      const entries = generateScheduleEntries(food, startDate, endDate);
      
      // Create all entries
      const createdEntries = [];
      for (const entry of entries) {
        try {
          const created = await storage.createScheduleEntry(entry, userId);
          createdEntries.push(created);
        } catch (error) {
          // Skip if entry already exists for this date
          console.log(`Skipping duplicate entry for ${entry.date}`);
        }
      }
      
      res.json({ created: createdEntries.length, entries: createdEntries });
    } catch (error) {
      console.error("Error generating schedule:", error);
      res.status(500).json({ message: "Failed to generate schedule" });
    }
  });

  // Calendar subscription route - generates live updating ICS feed
  app.get("/api/calendar/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const foods = await storage.getFoods(userId);
      const activeFoods = foods.filter(food => food.isActive);

      // Generate ICS calendar format for subscription
      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AllergyTracker//Food Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Food Schedule (Live)',
        'X-WR-CALDESC:Your personalized food allergy schedule - automatically updates',
        'X-PUBLISHED-TTL:PT1H', // Refresh every hour
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H'
      ];

      const formatDateForICS = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      // Create recurring events for each active food
      activeFoods.forEach(food => {
        const recurringRule = null; // TODO: Implement getRecurringRule function
        const foodStartDate = new Date(food.startDate + 'T09:00:00');
        const foodEndDate = new Date(food.startDate + 'T09:30:00');
        
        icsContent.push(
          'BEGIN:VEVENT',
          `UID:food-${food.id}-live@allergytracker.app`,
          `DTSTAMP:${formatDateForICS(new Date())}`,
          `DTSTART:${formatDateForICS(foodStartDate)}`,
          `DTEND:${formatDateForICS(foodEndDate)}`,
          `SUMMARY:🍎 ${food.name}`,
          `DESCRIPTION:${food.instructions}\\nFrequency: ${food.frequency}\\n\\nThis event updates automatically when you modify your food schedule.`,
          `CATEGORIES:Health,Food,Allergy`,
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT',
          ...(recurringRule ? [`RRULE:${recurringRule}`] : []),
          'END:VEVENT'
        );
      });

      icsContent.push('END:VCALENDAR');

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(icsContent.join('\r\n'));
    } catch (error) {
      res.status(500).json({ message: "Failed to generate calendar subscription" });
    }
  });

  // Calendar export route - generates ICS file for Apple Calendar
  app.get("/api/calendar/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const entries = await storage.getScheduleEntriesForDateRange(
        userId,
        startDate as string, 
        endDate as string
      );
      
      const foods = await storage.getFoods(userId);
      const foodMap = new Map(foods.map(food => [food.id, food]));

      // Generate ICS calendar format for Apple Calendar
      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AllergyTracker//Food Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Food Schedule',
        'X-WR-CALDESC:Your personalized food allergy schedule'
      ];

      // Create recurring events for each unique food instead of individual entries
      const processedFoods = new Set();
      
      const formatDateForICS = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      entries.forEach(entry => {
        const food = foodMap.get(entry.foodId);
        if (!food || processedFoods.has(food.id)) return;
        
        processedFoods.add(food.id);

        // Create recurring events based on food frequency
        const recurringRule = null; // TODO: Implement getRecurringRule function
        const foodStartDate = new Date(food.startDate + 'T09:00:00');
        const foodEndDate = new Date(food.startDate + 'T09:30:00');
        
        icsContent.push(
          'BEGIN:VEVENT',
          `UID:food-${food.id}-recurring@allergytracker.app`,
          `DTSTAMP:${formatDateForICS(new Date())}`,
          `DTSTART:${formatDateForICS(foodStartDate)}`,
          `DTEND:${formatDateForICS(foodEndDate)}`,
          `SUMMARY:🍎 ${food.name}`,
          `DESCRIPTION:${food.instructions}\\nFrequency: ${food.frequency}\\n\\nThis is a recurring event that will automatically continue. Update your food schedule in the app to modify or cancel.`,
          `CATEGORIES:Health,Food,Allergy`,
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT',
          ...(recurringRule ? [`RRULE:${recurringRule}`] : []),
          'END:VEVENT'
        );
      });

      icsContent.push('END:VCALENDAR');

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="food-schedule.ics"');
      res.send(icsContent.join('\r\n'));
    } catch (error) {
      res.status(500).json({ message: "Failed to generate calendar export" });
    }
  });

  // Route to clear schedule entries for a specific date
  app.delete("/api/schedule/date/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const date = req.params.date;
      await storage.deleteScheduleEntriesForDate(date, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear schedule entries for date" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
