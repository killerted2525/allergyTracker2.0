import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { type Food, type ScheduleEntry } from "@shared/schema";
import { formatDisplayDate } from "@/lib/date-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DayEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  scheduleEntries: ScheduleEntry[];
  foods: Food[];
}

const colorMap: Record<string, string> = {
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  purple: '#AF52DE',
  pink: '#FF2D92',
  yellow: '#FFCC00',
  teal: '#30B0C7',
  mint: '#00C7BE',
  indigo: '#5856D6',
};

export default function DayEditModal({ 
  isOpen, 
  onClose, 
  date, 
  scheduleEntries, 
  foods 
}: DayEditModalProps) {
  const [selectedFoodId, setSelectedFoodId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateString = date?.toISOString().split('T')[0];
  const dayEntries = scheduleEntries.filter(entry => entry.date === dateString);
  const foodsForDay = dayEntries.map(entry => ({
    entry,
    food: foods.find(food => food.id === entry.foodId)
  })).filter(item => item.food);

  const addFoodMutation = useMutation({
    mutationFn: async (foodId: number) => {
      return apiRequest('POST', '/api/schedule', {
        foodId,
        date: dateString,
        isCompleted: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      setSelectedFoodId("");
      toast({
        title: "Food added",
        description: "Food has been added to the schedule.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add food to schedule.",
        variant: "destructive",
      });
    }
  });

  const removeFoodMutation = useMutation({
    mutationFn: async (entryId: number) => {
      return apiRequest('DELETE', `/api/schedule/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      toast({
        title: "Food removed",
        description: "Food has been removed from the schedule.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove food from schedule.",
        variant: "destructive",
      });
    }
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ entryId, isCompleted }: { entryId: number; isCompleted: boolean }) => {
      return apiRequest('PATCH', `/api/schedule/${entryId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      toast({
        title: "Status updated",
        description: "Food completion status updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update completion status.",
        variant: "destructive",
      });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/schedule/date/${dateString}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      toast({
        title: "Day cleared",
        description: "All foods have been removed from this day.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear the day.",
        variant: "destructive",
      });
    }
  });

  const handleAddFood = () => {
    if (selectedFoodId) {
      addFoodMutation.mutate(parseInt(selectedFoodId));
    }
  };

  const handleRemoveFood = (entryId: number) => {
    removeFoodMutation.mutate(entryId);
  };

  const availableFoods = foods.filter(food => 
    !dayEntries.some(entry => entry.foodId === food.id)
  );

  if (!date) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Day Schedule</DialogTitle>
          <DialogDescription>
            Add or remove foods from your schedule for this day.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm" style={{ color: 'hsl(var(--apple-medium))' }}>
            {formatDisplayDate(date)}
          </div>
          
          {foodsForDay.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium" style={{ color: 'hsl(var(--apple-dark))' }}>
                Scheduled Foods
              </h4>
              {foodsForDay.map(({ entry, food }) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                  style={{ borderColor: 'hsl(var(--apple-border))' }}
                >
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleCompleteMutation.mutate({ 
                        entryId: entry.id, 
                        isCompleted: !entry.isCompleted 
                      })}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        entry.isCompleted 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                      disabled={toggleCompleteMutation.isPending}
                    >
                      {entry.isCompleted && (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div 
                      className="minecraft-modal-dot w-3 h-3 rounded-full transform transition-all duration-200 hover:scale-150"
                      style={{ 
                        backgroundColor: colorMap[food!.color] || colorMap.blue,
                        boxShadow: `0 0 0 0 ${colorMap[food!.color] || colorMap.blue}40`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.5)';
                        e.currentTarget.style.boxShadow = `0 0 10px 2px ${colorMap[food!.color] || colorMap.blue}60`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `0 0 0 0 ${colorMap[food!.color] || colorMap.blue}40`;
                      }}
                    />
                    <span className={`text-sm ${entry.isCompleted ? 'line-through text-gray-500' : ''}`}>
                      {food!.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFood(entry.id)}
                    className="text-red-500 hover:text-red-600"
                    disabled={removeFoodMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {availableFoods.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'hsl(var(--apple-dark))' }}>
                Add Food
              </label>
              <div className="flex space-x-2">
                <Select value={selectedFoodId} onValueChange={setSelectedFoodId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a food..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFoods.map((food) => (
                      <SelectItem key={food.id} value={food.id.toString()}>
                        {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddFood}
                  disabled={!selectedFoodId || addFoodMutation.isPending}
                  className="text-white"
                  style={{ backgroundColor: 'hsl(var(--apple-blue))' }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {foodsForDay.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    foodsForDay.forEach(({ entry }) => {
                      toggleCompleteMutation.mutate({ 
                        entryId: entry.id, 
                        isCompleted: !entry.isCompleted 
                      });
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="minecraft-action-btn flex-1 text-green-600 border-green-300 hover:bg-green-50 transform transition-all duration-300"
                  disabled={toggleCompleteMutation.isPending}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Mark All {foodsForDay.every(({ entry }) => entry.isCompleted) ? 'Incomplete' : 'Complete'}
                </Button>
                <Button
                  onClick={() => clearAllMutation.mutate()}
                  variant="outline"
                  size="sm"
                  className="minecraft-action-btn flex-1 text-red-600 border-red-300 hover:bg-red-50 transform transition-all duration-300"
                  disabled={clearAllMutation.isPending}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Clear Day
                </Button>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
