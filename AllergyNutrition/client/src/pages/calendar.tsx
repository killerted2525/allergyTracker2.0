import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3x3, Rows3, Square, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Dialog imports removed - no longer needed
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CalendarDay from "@/components/calendar-day";
import DayEditModal from "@/components/day-edit-modal";
import CalendarExport from "@/components/calendar-export";
// Scanner component removed

import UndoButton from "@/components/undo-button";

import SettingsModal from "@/components/settings-modal";
import { type Food, type ScheduleEntry } from "@shared/schema";
import { getMonthDays, formatMonthYear, isToday, isSameMonth, formatDate } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { OfflineManager } from "@/lib/offline";
import { SoundManager } from "@/lib/sounds";

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

interface CalendarViewProps {
  onNavigateToAddFood?: () => void;
  onNavigateToManageFoods?: () => void;
}

export default function CalendarView({ onNavigateToAddFood, onNavigateToManageFoods }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  // Scanner state removed
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize offline mode and sound manager
  useEffect(() => {
    const offlineManager = OfflineManager.getInstance();
    const soundManager = SoundManager.getInstance();
    
    offlineManager.init();
  }, []);

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return {
          startDate: new Date(currentDate),
          endDate: new Date(currentDate)
        };
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        return { startDate: weekStart, endDate: weekEnd };
      case 'month':
      default:
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        return { startDate: monthStart, endDate: monthEnd };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { data: foods = [] } = useQuery<Food[]>({
    queryKey: ['/api/foods'],
  });

  const { data: scheduleEntries = [] } = useQuery<ScheduleEntry[]>({
    queryKey: ['/api/schedule', { 
      startDate: formatDate(startDate), 
      endDate: formatDate(endDate) 
    }],
    queryFn: async () => {
      const response = await fetch(
        `/api/schedule?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
      );
      if (!response.ok) throw new Error('Failed to fetch schedule');
      return response.json();
    }
  });

  const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDisplayTitle = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week':
        const { startDate: weekStart, endDate: weekEnd } = getDateRange();
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        } else {
          return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekStart.getFullYear()}`;
        }
      case 'month':
        return formatMonthYear(currentDate);
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Calculate today's completion stats
  const todayString = formatDate(new Date());
  const todayEntries = scheduleEntries.filter(entry => entry.date === todayString);
  const completedToday = todayEntries.filter(entry => entry.isCompleted).length;
  const totalToday = todayEntries.length;

  const completeFoodMutation = useMutation({
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

  const handleCompleteFood = async (entryId: number, isCompleted: boolean) => {
    completeFoodMutation.mutate({ entryId, isCompleted });
  };

  const renderDayView = () => {
    const dayEntries = scheduleEntries.filter(entry => entry.date === formatDate(currentDate));
    const dayFoods = dayEntries.map(entry => 
      foods.find(food => food.id === entry.foodId)
    ).filter(Boolean) as Food[];

    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <h3 className="text-2xl font-semibold mb-2" style={{ color: 'hsl(var(--apple-dark))' }}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </h3>
          <p className="text-lg" style={{ color: 'hsl(var(--apple-medium))' }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        
        {dayFoods.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-semibold" style={{ color: 'hsl(var(--apple-dark))' }}>Today's Foods:</h4>
            {dayEntries.map(entry => {
              const food = foods.find(f => f.id === entry.foodId);
              if (!food) return null;
              
              return (
                <div key={entry.id} className="minecraft-food-card flex items-center space-x-3 p-3 rounded-lg bg-gray-50 transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  <button
                    onClick={() => handleCompleteFood(entry.id, !entry.isCompleted)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 minecraft-checkbox ${
                      entry.isCompleted 
                        ? 'bg-green-500 border-green-500 hover:bg-green-600' 
                        : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                    }`}
                    onMouseEnter={(e) => {
                      if (e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {entry.isCompleted && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <div 
                    className="minecraft-color-dot w-4 h-4 rounded-full transition-all duration-300 hover:scale-125"
                    style={{ backgroundColor: colorMap[food.color] || colorMap.blue }}
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${entry.isCompleted ? 'line-through text-gray-500' : ''}`}>
                      {food.name}
                    </p>
                    <p className={`text-sm ${entry.isCompleted ? 'line-through text-gray-400' : ''}`} 
                       style={{ color: entry.isCompleted ? 'hsl(var(--apple-light))' : 'hsl(var(--apple-medium))' }}>
                      {food.instructions}
                    </p>
                    {/* Progressive amount display */}
                    {entry.calculatedAmount && (
                      <p className={`text-xs font-medium ${entry.isCompleted ? 'line-through text-gray-400' : ''}`}
                         style={{ color: entry.isCompleted ? 'hsl(var(--apple-light))' : '#FF9500' }}>
                        💊 Amount: {entry.calculatedAmount}
                      </p>
                    )}
                    {/* Progressive time display */}
                    {entry.calculatedTime && (
                      <p className={`text-xs font-medium ${entry.isCompleted ? 'line-through text-gray-400' : ''}`}
                         style={{ color: entry.isCompleted ? 'hsl(var(--apple-light))' : '#007AFF' }}>
                        ⏰ Time: {entry.calculatedTime}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p style={{ color: 'hsl(var(--apple-medium))' }}>No foods scheduled for this day</p>
          </div>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const { startDate: weekStart } = getDateRange();
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      weekDays.push(day);
    }

    return (
      <div className="space-y-3">
        {weekDays.map(day => {
          const dayEntries = scheduleEntries.filter(entry => entry.date === formatDate(day));
          const dayFoods = dayEntries.map(entry => 
            foods.find(food => food.id === entry.foodId)
          ).filter(Boolean) as Food[];

          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                isToday(day) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`font-medium ${
                  isToday(day) ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  {isToday(day) && <span className="ml-2 text-sm font-normal text-blue-500">(Today)</span>}
                </div>
                {dayFoods.length > 0 && (
                  <span className="text-sm text-gray-500">{dayFoods.length} food{dayFoods.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              
              {dayFoods.length > 0 ? (
                <div className="space-y-2">
                  {dayEntries.map(entry => {
                    const food = foods.find(f => f.id === entry.foodId);
                    if (!food) return null;
                    
                    return (
                      <div key={entry.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-100 calendar-item perfect-shadow">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteFood(entry.id, !entry.isCompleted);
                          }}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 minecraft-checkbox ${
                            entry.isCompleted 
                              ? 'bg-green-500 border-green-500 hover:bg-green-600' 
                              : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                          }`}
                        >
                          {entry.isCompleted && (
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colorMap[food.color] || colorMap.blue }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${entry.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {food.name}
                          </p>
                          <p className={`text-xs truncate ${entry.isCompleted ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                            {food.instructions}
                          </p>
                          {/* Progressive amount display */}
                          {entry.calculatedAmount && (
                            <p className={`text-xs font-medium truncate ${entry.isCompleted ? 'line-through text-gray-400' : ''}`}
                               style={{ color: entry.isCompleted ? 'gray' : '#FF9500' }}>
                              💊 {entry.calculatedAmount}
                            </p>
                          )}
                          {/* Progressive time display */}
                          {entry.calculatedTime && (
                            <p className={`text-xs font-medium truncate ${entry.isCompleted ? 'line-through text-gray-400' : ''}`}
                               style={{ color: entry.isCompleted ? 'gray' : '#007AFF' }}>
                              ⏰ {entry.calculatedTime}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-400">No foods scheduled</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium py-2" style={{ color: 'hsl(var(--apple-medium))' }}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map(day => (
            <CalendarDay
              key={day.toISOString()}
              date={day}
              isCurrentMonth={isSameMonth(day, currentDate)}
              isToday={isToday(day)}
              scheduleEntries={scheduleEntries.filter(entry => entry.date === formatDate(day))}
              foods={foods}
              onClick={handleDayClick}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-6 border border-gray-200/50">
      {/* Apple Calendar-style Header - Mobile Optimized */}
      <div className="mb-2 sm:mb-6">
        {/* Navigation Controls - Mobile Full Width */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('prev')}
              className="px-2 sm:px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              <ChevronLeft size={16} className="mr-1" style={{ color: 'hsl(var(--apple-medium))' }} />
              <span className="text-sm font-medium hidden sm:inline" style={{ color: 'hsl(var(--apple-dark))' }}>Previous</span>
              <span className="text-sm font-medium sm:hidden" style={{ color: 'hsl(var(--apple-dark))' }}>Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('next')}
              className="px-2 sm:px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              <span className="text-sm font-medium mr-1 hidden sm:inline" style={{ color: 'hsl(var(--apple-dark))' }}>Next</span>
              <span className="text-sm font-medium mr-1 sm:hidden" style={{ color: 'hsl(var(--apple-dark))' }}>Next</span>
              <ChevronRight size={16} style={{ color: 'hsl(var(--apple-medium))' }} />
            </Button>
          </div>
          
          {/* View Mode Selector - Mobile Friendly */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="px-2 sm:px-3 py-1 text-sm font-medium rounded-lg hover:bg-gray-100 hidden sm:block"
              style={{ color: 'hsl(var(--apple-blue))' }}
            >
              Today
            </Button>
            <Select value={viewMode} onValueChange={(value: 'day' | 'week' | 'month') => setViewMode(value)}>
              <SelectTrigger className="w-24 sm:w-32 h-8 text-sm bg-gray-100 border-0 hover:bg-gray-200 transition-colors">
                <SelectValue>
                  <div className="flex items-center">
                    {viewMode === 'day' && <Square size={14} className="mr-1" />}
                    {viewMode === 'week' && <Rows3 size={14} className="mr-1" />}
                    {viewMode === 'month' && <Grid3x3 size={14} className="mr-1" />}
                    <span>{viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">
                  <div className="flex items-center">
                    <Square size={14} className="mr-2" />
                    Day
                  </div>
                </SelectItem>
                <SelectItem value="week">
                  <div className="flex items-center">
                    <Rows3 size={14} className="mr-2" />
                    Week
                  </div>
                </SelectItem>
                <SelectItem value="month">
                  <div className="flex items-center">
                    <Grid3x3 size={14} className="mr-2" />
                    Month
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Title and Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <h2 className="text-base sm:text-xl font-semibold" style={{ color: 'hsl(var(--apple-dark))' }}>
            {getDisplayTitle()}
          </h2>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 self-start sm:self-auto">
            {/* Export and Today (Mobile) */}
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <CalendarExport startDate={startDate} endDate={endDate} />
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="px-2 py-2 text-xs font-medium rounded-lg hover:bg-gray-100 sm:hidden flex-1 h-9"
                style={{ color: 'hsl(var(--apple-blue))' }}
              >
                Today
              </Button>
            </div>
            
            {/* Settings */}
            <div className="flex items-center w-full sm:w-auto">
              <SettingsModal />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="min-h-96">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {/* Day Edit Modal */}
      <DayEditModal
        isOpen={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        date={selectedDate}
        scheduleEntries={scheduleEntries}
        foods={foods}
      />



      {/* Floating Action Components */}
      <div className="mobile-landscape-floating">
        <UndoButton />
      </div>
    </div>
  );
}
