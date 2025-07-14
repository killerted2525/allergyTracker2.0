import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodSchema, insertScheduleEntrySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Food routes
  app.get("/api/foods", async (req, res) => {
    try {
      const foods = await storage.getFoods();
      res.json(foods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch foods" });
    }
  });

  app.post("/api/foods", async (req, res) => {
    try {
      const validatedData = insertFoodSchema.parse(req.body);
      const food = await storage.createFood(validatedData);
      res.status(201).json(food);
    } catch (error) {
      res.status(400).json({ message: "Invalid food data" });
    }
  });

  app.patch("/api/foods/:id", async (req, res) => {
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

  app.delete("/api/foods/:id", async (req, res) => {
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

  // Schedule routes
  app.get("/api/schedule", async (req, res) => {
    try {
      const { startDate, endDate, date } = req.query;
      
      let entries;
      if (startDate && endDate) {
        entries = await storage.getScheduleEntriesForDateRange(
          startDate as string, 
          endDate as string
        );
      } else {
        entries = await storage.getScheduleEntries(date as string);
      }
      
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule entries" });
    }
  });

  app.post("/api/schedule", async (req, res) => {
    try {
      const validatedData = insertScheduleEntrySchema.parse(req.body);
      const entry = await storage.createScheduleEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule entry data" });
    }
  });

  app.patch("/api/schedule/:id", async (req, res) => {
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

  app.delete("/api/schedule/:id", async (req, res) => {
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

  // Generate schedule for a food based on frequency
  app.post("/api/foods/:id/generate-schedule", async (req, res) => {
    try {
      const foodId = parseInt(req.params.id);
      const { startDate, endDate } = req.body;
      
      const food = await storage.getFood(foodId);
      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }

      // Generate schedule entries based on frequency
      const entries = generateScheduleEntries(food, startDate, endDate);
      
      // Create all entries
      const createdEntries = [];
      for (const entry of entries) {
        const created = await storage.createScheduleEntry(entry);
        createdEntries.push(created);
      }
      
      res.json(createdEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate schedule" });
    }
  });

  // Calendar subscription route - generates live updating ICS feed
  app.get("/api/calendar/subscribe", async (req, res) => {
    try {
      const foods = await storage.getFoods();
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
        const recurringRule = getRecurringRule(food.frequency);
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
  app.get("/api/calendar/export", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const entries = await storage.getScheduleEntriesForDateRange(
        startDate as string, 
        endDate as string
      );
      
      const foods = await storage.getFoods();
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
        const recurringRule = getRecurringRule(food.frequency);
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
  app.delete("/api/schedule/date/:date", async (req, res) => {
    try {
      const date = req.params.date;
      await storage.deleteScheduleEntriesForDate(date);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear schedule entries for date" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateScheduleEntries(food: any, startDate: string, endDate: string) {
  const entries = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    let shouldInclude = false;
    const daysDiff = Math.floor((current.getTime() - new Date(food.startDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Parse custom frequency patterns
    const frequency = food.frequency.toLowerCase();
    
    if (frequency.includes('every day') || frequency === 'daily') {
      shouldInclude = true;
    } else if (frequency.includes('every 2 days') || frequency.includes('every other day')) {
      shouldInclude = daysDiff % 2 === 0;
    } else if (frequency.includes('every 3 days')) {
      shouldInclude = daysDiff % 3 === 0;
    } else if (frequency.includes('weekly') || frequency.includes('every week')) {
      shouldInclude = daysDiff % 7 === 0;
    } else if (frequency.includes('twice')) {
      // For "twice daily" or similar, create multiple entries per day
      shouldInclude = true;
    } else if (frequency.match(/(\d+)\s*times?\s*per\s*week/)) {
      const timesPerWeek = parseInt(frequency.match(/(\d+)\s*times?\s*per\s*week/)[1]);
      const weekNumber = Math.floor(daysDiff / 7);
      const dayOfWeek = daysDiff % 7;
      // Distribute evenly throughout the week
      const interval = Math.floor(7 / timesPerWeek);
      shouldInclude = dayOfWeek % interval === 0 && dayOfWeek < timesPerWeek * interval;
    } else {
      // Default to daily for unknown patterns
      shouldInclude = true;
    }

    if (shouldInclude) {
      entries.push({
        foodId: food.id,
        date: current.toISOString().split('T')[0],
        isCompleted: false,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return entries;
}

// Function to convert food frequency to ICS recurring rules
function getRecurringRule(frequency: string): string | null {
  const freq = frequency.toLowerCase();
  
  if (freq.includes('every day') || freq === 'daily') {
    return 'FREQ=DAILY';
  } else if (freq.includes('every 2 days') || freq.includes('every other day')) {
    return 'FREQ=DAILY;INTERVAL=2';
  } else if (freq.includes('every 3 days')) {
    return 'FREQ=DAILY;INTERVAL=3';
  } else if (freq.includes('weekly') || freq.includes('every week')) {
    return 'FREQ=WEEKLY';
  } else if (freq.includes('twice daily')) {
    return 'FREQ=DAILY';
  } else if (freq.match(/(\d+)\s*times?\s*per\s*week/)) {
    const timesPerWeek = parseInt(freq.match(/(\d+)\s*times?\s*per\s*week/)[1]);
    // For multiple times per week, we'll use daily with specific days
    if (timesPerWeek === 2) {
      return 'FREQ=WEEKLY;BYDAY=MO,TH'; // Monday and Thursday
    } else if (timesPerWeek === 3) {
      return 'FREQ=WEEKLY;BYDAY=MO,WE,FR'; // Monday, Wednesday, Friday
    } else if (timesPerWeek === 4) {
      return 'FREQ=WEEKLY;BYDAY=MO,TU,TH,FR'; // Monday, Tuesday, Thursday, Friday
    } else if (timesPerWeek === 5) {
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'; // Weekdays
    } else if (timesPerWeek === 6) {
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA'; // Monday-Saturday
    } else if (timesPerWeek === 7) {
      return 'FREQ=DAILY';
    }
  } else if (freq.includes('monthly') || freq.includes('every month')) {
    return 'FREQ=MONTHLY';
  }
  
  // Default to daily for unknown patterns
  return 'FREQ=DAILY';
}
