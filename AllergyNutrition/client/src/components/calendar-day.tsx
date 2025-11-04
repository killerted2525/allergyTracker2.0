import { type Food, type ScheduleEntry } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  scheduleEntries: ScheduleEntry[];
  foods: Food[];
  onClick: (date: Date) => void;
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

export default function CalendarDay({ 
  date, 
  isCurrentMonth, 
  isToday, 
  scheduleEntries, 
  foods,
  onClick 
}: CalendarDayProps) {
  const dayNumber = date.getDate();
  const dateString = date.toISOString().split('T')[0];
  const dayEntries = scheduleEntries.filter(entry => entry.date === dateString);
  
  const foodsForDay = dayEntries.map(entry => 
    foods.find(food => food.id === entry.foodId)
  ).filter(Boolean) as Food[];

  return (
    <div 
      className={`calendar-day min-h-24 p-2 border rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-105 ${
        !isCurrentMonth ? 'opacity-50' : ''
      } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
      style={{ borderColor: 'hsl(var(--apple-border))' }}
      onClick={() => onClick(date)}
      onMouseEnter={(e) => {
        if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
          e.currentTarget.style.transform = 'scale(1) translateY(0px)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onTouchStart={(e) => {
        if (e.currentTarget?.style) {
          e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        }
      }}
      onTouchEnd={(e) => {
        setTimeout(() => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.transform = 'scale(1) translateY(0px)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }, 150);
      }}
    >
      <div 
        className={`text-sm mb-1 ${
          isCurrentMonth ? 'font-medium' : ''
        }`}
        style={{ 
          color: isCurrentMonth ? 'hsl(var(--apple-dark))' : 'hsl(var(--apple-medium))' 
        }}
      >
        {dayNumber}
      </div>
      <div className="space-y-1">
        {foodsForDay.slice(0, 3).map((food) => (
          <div
            key={food.id}
            className="minecraft-food-item text-xs text-white px-2 py-1 rounded-md text-center transform transition-all duration-200 ease-out hover:scale-110 hover:z-10 hover:shadow-lg cursor-pointer active:scale-110 active:shadow-lg"
            style={{ 
              backgroundColor: colorMap[food.color] || colorMap.blue,
              boxShadow: `0 0 0 0 ${colorMap[food.color] || colorMap.blue}40`
            }}
            onMouseEnter={(e) => {
              if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
                e.currentTarget.style.boxShadow = `0 0 12px 2px ${colorMap[food.color] || colorMap.blue}60`;
                e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
                e.currentTarget.style.boxShadow = `0 0 0 0 ${colorMap[food.color] || colorMap.blue}40`;
                e.currentTarget.style.transform = 'scale(1) translateY(0px)';
              }
            }}
            onTouchStart={(e) => {
              if (e.currentTarget?.style) {
                e.currentTarget.style.boxShadow = `0 0 12px 2px ${colorMap[food.color] || colorMap.blue}60`;
                e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
              }
            }}
            onTouchEnd={(e) => {
              setTimeout(() => {
                if (e.currentTarget?.style) {
                  e.currentTarget.style.boxShadow = `0 0 0 0 ${colorMap[food.color] || colorMap.blue}40`;
                  e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                }
              }, 150);
            }}
          >
            {food.name}
          </div>
        ))}
        {foodsForDay.length > 3 && (
          <div 
            className="text-xs px-2 py-1 rounded-md text-center"
            style={{ 
              backgroundColor: 'hsl(var(--apple-gray))',
              color: 'hsl(var(--apple-medium))'
            }}
          >
            +{foodsForDay.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}
