import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertFoodSchema, type Food } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

const formSchema = insertFoodSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "any"]).default("any"),
  // Dose progression fields
  startingAmount: z.string().optional(),
  targetAmount: z.string().optional(),
  progressionType: z.enum(["buildup", "static", "reduction", "custom"]).optional(),
  progressionDuration: z.number().min(1).optional(),
  // Time scheduling fields
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timeProgression: z.enum(["later", "earlier", "static"]).optional(),
  timeProgressionAmount: z.number().min(1).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FoodFormProps {
  food?: Food;
  onSuccess?: () => void;
}

const colorOptions = [
  { value: 'blue', label: 'Blue', color: '#007AFF' },
  { value: 'green', label: 'Green', color: '#34C759' },
  { value: 'orange', label: 'Orange', color: '#FF9500' },
  { value: 'red', label: 'Red', color: '#FF3B30' },
  { value: 'purple', label: 'Purple', color: '#AF52DE' },
  { value: 'pink', label: 'Pink', color: '#FF2D92' },
  { value: 'yellow', label: 'Yellow', color: '#FFCC00' },
  { value: 'teal', label: 'Teal', color: '#30B0C7' },
  { value: 'mint', label: 'Mint', color: '#00C7BE' },
  { value: 'indigo', label: 'Indigo', color: '#5856D6' },
];

export default function FoodForm({ food, onSuccess }: FoodFormProps) {
  const [selectedColor, setSelectedColor] = useState(food?.color || 'blue');
  const [customStartAmount, setCustomStartAmount] = useState(false);
  const [customTargetAmount, setCustomTargetAmount] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(false);
  const [customTargetTime, setCustomTargetTime] = useState(false);
  const [saveStep, setSaveStep] = useState<'idle' | 'saving' | 'scheduling' | 'complete'>('idle');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: food?.name || "",
      instructions: food?.instructions || "",
      color: food?.color || 'blue',
      frequency: food?.frequency || "Every day",
      startDate: food?.startDate || formatDate(new Date()),
      mealType: food?.mealType || "any",
      // Dose progression defaults
      startingAmount: food?.startingAmount || "",
      targetAmount: food?.targetAmount || "",
      progressionType: (food?.progressionType as "buildup" | "static" | "reduction" | "custom") || "static",
      progressionDuration: food?.progressionDuration || undefined,
      // Time scheduling defaults
      startTime: food?.startTime || "",
      endTime: food?.endTime || "",
      timeProgression: (food?.timeProgression as "later" | "earlier" | "static") || "static", 
      timeProgressionAmount: food?.timeProgressionAmount || undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setSaveStep('saving');
      toast({
        title: "Saving food...",
        description: "Creating your food entry.",
      });
      
      const response = await apiRequest('POST', '/api/foods', data);
      const newFood = await response.json();
      
      setSaveStep('scheduling');
      toast({
        title: "Generating schedule...",
        description: "Creating your food schedule for the next 3 months.",
      });
      
      // Generate schedule for the new food
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // 3 months ahead
      
      try {
        await apiRequest('POST', `/api/foods/${newFood.id}/generate-schedule`, {
          startDate: data.startDate,
          endDate: formatDate(endDate),
        });
      } catch (scheduleError) {
        // Food was saved but schedule failed - still show success but warn about schedule
        console.warn('Schedule generation failed:', scheduleError);
        toast({
          title: "Food saved with schedule issue",
          description: "Your food was saved but schedule generation had an issue. You can add it manually.",
          variant: "destructive",
        });
      }
      
      setSaveStep('complete');
      return newFood;
    },
    onSuccess: (newFood) => {
      queryClient.invalidateQueries({ queryKey: ['/api/foods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      form.reset();
      setSelectedColor('blue');
      setSaveStep('idle');
      onSuccess?.();
      toast({
        title: "Food added successfully!",
        description: "Your food has been added to your schedule.",
      });
    },
    onError: (error) => {
      console.error('Error adding food:', error);
      setSaveStep('idle');
      toast({
        title: "Save failed",
        description: "Failed to save your food. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest('PATCH', `/api/foods/${food!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/foods'] });
      onSuccess?.();
      toast({
        title: "Food updated",
        description: "Food has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update food.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FormData) => {
    if (food) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  
  const getSaveButtonText = () => {
    if (saveStep === 'saving') return 'Saving Food...';
    if (saveStep === 'scheduling') return 'Creating Schedule...';
    if (isLoading && food) return 'Updating...';
    if (isLoading) return 'Saving...';
    return food ? 'Update Food' : 'Save Food';
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Food Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Peanut Butter" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g., 1 teaspoon with breakfast" 
                  rows={3} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`w-10 h-10 rounded-xl border-2 transition-all duration-200 ${
                        selectedColor === option.value 
                          ? 'ring-2 ring-blue-500 scale-110 shadow-lg' 
                          : 'border-gray-200 hover:scale-105 hover:shadow-md'
                      }`}
                      style={{ backgroundColor: option.color }}
                      onClick={() => {
                        setSelectedColor(option.value);
                        field.onChange(option.value);
                      }}
                      title={option.label}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How Often</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Every day">📅 Every day</SelectItem>
                    <SelectItem value="2 times a week">📅 2 times a week</SelectItem>
                    <SelectItem value="3 times a week">📅 3 times a week</SelectItem>
                    <SelectItem value="4 times a week">📅 4 times a week</SelectItem>
                    <SelectItem value="5 times a week">📅 5 times a week</SelectItem>
                    <SelectItem value="6 times a week">📅 6 times a week</SelectItem>
                    <SelectItem value="Once a week">📅 Once a week</SelectItem>
                    <SelectItem value="Every 2 days">📅 Every 2 days</SelectItem>
                    <SelectItem value="Every 3 days">📅 Every 3 days</SelectItem>
                    <SelectItem value="Twice daily">📅 Twice daily</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mealType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meal Category</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                    <SelectItem value="lunch">🍽️ Lunch</SelectItem>
                    <SelectItem value="dinner">🌙 Dinner</SelectItem>
                    <SelectItem value="snack">🍪 Snack</SelectItem>
                    <SelectItem value="any">⏰ Any Time</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dose Progression Section */}
        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            💊 Dose Progression (Optional)
          </h3>
          <p className="text-xs text-gray-500">
            Set up a buildup schedule that gradually increases amounts over time
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startingAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Starting Amount</FormLabel>
                  <FormControl>
                    {customStartAmount ? (
                      <div className="space-y-2">
                        <Input 
                          placeholder="e.g., 0.25 teaspoons or 2 pieces" 
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomStartAmount(false);
                            field.onChange("");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          ← Back to presets
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setCustomStartAmount(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select starting dose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.01 teaspoon">0.01 teaspoon (tiny)</SelectItem>
                          <SelectItem value="0.05 teaspoon">0.05 teaspoon (pinch)</SelectItem>
                          <SelectItem value="0.1 teaspoon">0.1 teaspoon (small)</SelectItem>
                          <SelectItem value="0.25 teaspoon">1/4 teaspoon</SelectItem>
                          <SelectItem value="0.5 teaspoon">1/2 teaspoon</SelectItem>
                          <SelectItem value="1 teaspoon">1 teaspoon</SelectItem>
                          <SelectItem value="1.5 teaspoon">1.5 teaspoons</SelectItem>
                          <SelectItem value="2 teaspoons">2 teaspoons</SelectItem>
                          <SelectItem value="0.5 tablespoon">1/2 tablespoon</SelectItem>
                          <SelectItem value="1 tablespoon">1 tablespoon</SelectItem>
                          <SelectItem value="1 piece">1 piece/serving</SelectItem>
                          <SelectItem value="1 ml">1 ml (liquid)</SelectItem>
                          <SelectItem value="5 ml">5 ml (liquid)</SelectItem>
                          <SelectItem value="10 ml">10 ml (liquid)</SelectItem>
                          <SelectItem value="custom">✏️ Enter custom amount</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Target Amount</FormLabel>
                  <FormControl>
                    {customTargetAmount ? (
                      <div className="space-y-2">
                        <Input 
                          placeholder="e.g., 1.5 tablespoons or 3 pieces" 
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomTargetAmount(false);
                            field.onChange("");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          ← Back to presets
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setCustomTargetAmount(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target dose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5 teaspoon">1/2 teaspoon</SelectItem>
                          <SelectItem value="1 teaspoon">1 teaspoon</SelectItem>
                          <SelectItem value="2 teaspoons">2 teaspoons</SelectItem>
                          <SelectItem value="1 tablespoon">1 tablespoon</SelectItem>
                          <SelectItem value="2 tablespoons">2 tablespoons</SelectItem>
                          <SelectItem value="3 tablespoons">3 tablespoons</SelectItem>
                          <SelectItem value="0.25 cup">1/4 cup</SelectItem>
                          <SelectItem value="0.5 cup">1/2 cup</SelectItem>
                          <SelectItem value="1 cup">1 cup (full serving)</SelectItem>
                          <SelectItem value="1 piece">1 piece/serving</SelectItem>
                          <SelectItem value="2 pieces">2 pieces</SelectItem>
                          <SelectItem value="1 slice">1 slice</SelectItem>
                          <SelectItem value="2 slices">2 slices</SelectItem>
                          <SelectItem value="30 ml">30 ml (liquid)</SelectItem>
                          <SelectItem value="50 ml">50 ml (liquid)</SelectItem>
                          <SelectItem value="100 ml">100 ml (liquid)</SelectItem>
                          <SelectItem value="250 ml">250 ml (1 cup liquid)</SelectItem>
                          <SelectItem value="custom">✏️ Enter custom amount</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="progressionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Progression Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">📏 Static (same amount)</SelectItem>
                        <SelectItem value="buildup">📈 Buildup (increase over time)</SelectItem>
                        <SelectItem value="reduction">📉 Reduction (decrease over time)</SelectItem>
                        <SelectItem value="custom">🎯 Custom progression</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="progressionDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Duration</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="5">5 days</SelectItem>
                        <SelectItem value="7">1 week (7 days)</SelectItem>
                        <SelectItem value="10">10 days</SelectItem>
                        <SelectItem value="14">2 weeks (14 days)</SelectItem>
                        <SelectItem value="21">3 weeks (21 days)</SelectItem>
                        <SelectItem value="30">1 month (30 days)</SelectItem>
                        <SelectItem value="45">6 weeks (45 days)</SelectItem>
                        <SelectItem value="60">2 months (60 days)</SelectItem>
                        <SelectItem value="90">3 months (90 days)</SelectItem>
                        <SelectItem value="120">4 months (120 days)</SelectItem>
                        <SelectItem value="180">6 months (180 days)</SelectItem>
                        <SelectItem value="365">1 year (365 days)</SelectItem>
                        <SelectItem value="999999">♾️ Forever (no end date)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Time Adjustment Section */}
        <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ⏰ Time Scheduling (Optional)
          </h3>
          <p className="text-xs text-gray-500">
            Schedule foods at specific times with progressive adjustment
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Start Time</FormLabel>
                  <FormControl>
                    {customStartTime ? (
                      <div className="space-y-2">
                        <Input 
                          type="time"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomStartTime(false);
                            field.onChange("");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          ← Back to presets
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setCustomStartTime(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="06:00">6:00 AM (Early Morning)</SelectItem>
                          <SelectItem value="07:00">7:00 AM (Breakfast)</SelectItem>
                          <SelectItem value="08:00">8:00 AM (Morning)</SelectItem>
                          <SelectItem value="09:00">9:00 AM</SelectItem>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM (Lunch)</SelectItem>
                          <SelectItem value="13:00">1:00 PM</SelectItem>
                          <SelectItem value="14:00">2:00 PM</SelectItem>
                          <SelectItem value="15:00">3:00 PM (Afternoon)</SelectItem>
                          <SelectItem value="16:00">4:00 PM</SelectItem>
                          <SelectItem value="17:00">5:00 PM</SelectItem>
                          <SelectItem value="18:00">6:00 PM (Dinner)</SelectItem>
                          <SelectItem value="19:00">7:00 PM (Evening)</SelectItem>
                          <SelectItem value="20:00">8:00 PM</SelectItem>
                          <SelectItem value="21:00">9:00 PM</SelectItem>
                          <SelectItem value="22:00">10:00 PM</SelectItem>
                          <SelectItem value="custom">🕐 Enter custom time</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Target End Time</FormLabel>
                  <FormControl>
                    {customTargetTime ? (
                      <div className="space-y-2">
                        <Input 
                          type="time"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomTargetTime(false);
                            field.onChange("");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          ← Back to presets
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setCustomTargetTime(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="08:00">8:00 AM (Morning)</SelectItem>
                          <SelectItem value="09:00">9:00 AM</SelectItem>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM (Lunch)</SelectItem>
                          <SelectItem value="14:00">2:00 PM</SelectItem>
                          <SelectItem value="16:00">4:00 PM</SelectItem>
                          <SelectItem value="18:00">6:00 PM (Dinner)</SelectItem>
                          <SelectItem value="19:00">7:00 PM</SelectItem>
                          <SelectItem value="20:00">8:00 PM</SelectItem>
                          <SelectItem value="21:00">9:00 PM</SelectItem>
                          <SelectItem value="22:00">10:00 PM</SelectItem>
                          <SelectItem value="23:00">11:00 PM (Late)</SelectItem>
                          <SelectItem value="custom">🕐 Enter custom time</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="timeProgression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Time Progression</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select progression" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">📍 Static (same time)</SelectItem>
                        <SelectItem value="later">⏰ Later each day</SelectItem>
                        <SelectItem value="earlier">🌅 Earlier each day</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeProgressionAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Adjust by</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select adjustment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full gradient-button text-white font-medium py-3 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          style={{ backgroundColor: '#007AFF' }}
        >
          {getSaveButtonText()}
        </Button>
      </form>
    </Form>
  );
}
