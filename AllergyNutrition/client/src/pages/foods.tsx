import { useState } from "react";
import { Edit, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FoodForm from "@/components/food-form";
import { type Food } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function ManageFoodsView() {
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: foods = [], isLoading } = useQuery<Food[]>({
    queryKey: ['/api/foods'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/foods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/foods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      toast({
        title: "Food deleted",
        description: "Food has been removed from your schedule.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete food.",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (food: Food) => {
    setEditingFood(food);
    // Scroll to top of form when editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this food? This will remove all scheduled entries.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    setEditingFood(null);
  };

  const handleExport = () => {
    const data = JSON.stringify(foods, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allergy-tracker-foods.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 apple-shadow">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 apple-shadow">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {editingFood && (
        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 apple-shadow-lg border border-white/20 ring-2 ring-blue-400 bg-blue-50/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Edit: {editingFood.name}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingFood(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Cancel
            </Button>
          </div>
          
          <FoodForm food={editingFood} onSuccess={handleFormSuccess} />
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 apple-shadow-lg border border-white/20">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'hsl(var(--apple-dark))' }}>
            Manage Foods
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--apple-medium))' }}>
            Edit or delete your existing food items. Click the edit button to modify food details.
          </p>
        </div>
        
        {foods.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'hsl(var(--apple-medium))' }}>
              No foods added yet. Create your first food item to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {foods.map((food) => (
              <div 
                key={food.id}
                className="minecraft-food-card flex items-center justify-between p-4 border rounded-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:bg-gray-50 cursor-pointer transform active:scale-105 active:shadow-xl"
                style={{ 
                  borderColor: 'hsl(var(--apple-border))',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 8px 25px rgba(0,0,0,0.15), 0 0 20px ${colorMap[food.color] || colorMap.blue}30`;
                    e.currentTarget.style.borderColor = colorMap[food.color] || colorMap.blue;
                  }
                }}
                onMouseLeave={(e) => {
                  if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
                    e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = 'hsl(var(--apple-border))';
                  }
                }}
                onTouchStart={(e) => {
                  if (e.currentTarget?.style) {
                    e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.12), 0 0 15px ${colorMap[food.color] || colorMap.blue}25`;
                    e.currentTarget.style.borderColor = colorMap[food.color] || colorMap.blue;
                  }
                }}
                onTouchEnd={(e) => {
                  setTimeout(() => {
                    if (e.currentTarget?.style) {
                      e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = 'hsl(var(--apple-border))';
                    }
                  }, 200);
                }}
              >
                <div className="flex items-center space-x-4">
                  <div 
                    className="minecraft-color-dot w-5 h-5 rounded-full flex-shrink-0 transform transition-all duration-300 hover:scale-125 hover:shadow-lg active:scale-125"
                    style={{ 
                      backgroundColor: colorMap[food.color] || colorMap.blue,
                      boxShadow: `0 0 0 0 ${colorMap[food.color] || colorMap.blue}40`
                    }}
                    onMouseEnter={(e) => {
                      if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1.25)';
                        e.currentTarget.style.boxShadow = `0 0 15px 3px ${colorMap[food.color] || colorMap.blue}50`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (window.matchMedia('(hover: hover)').matches && e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = `0 0 0 0 ${colorMap[food.color] || colorMap.blue}40`;
                      }
                    }}
                    onTouchStart={(e) => {
                      if (e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1.2)';
                        e.currentTarget.style.boxShadow = `0 0 12px 2px ${colorMap[food.color] || colorMap.blue}50`;
                      }
                    }}
                    onTouchEnd={(e) => {
                      setTimeout(() => {
                        if (e.currentTarget?.style) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = `0 0 0 0 ${colorMap[food.color] || colorMap.blue}40`;
                        }
                      }, 150);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-lg" style={{ color: 'hsl(var(--apple-dark))' }}>
                      {food.name}
                    </div>
                    <div className="text-sm" style={{ color: 'hsl(var(--apple-medium))' }}>
                      <span className="font-medium">{food.frequency}</span> • {food.instructions}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'hsl(var(--apple-light))' }}>
                      Started: {new Date(food.startDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(food)}
                    className="minecraft-action-btn p-2 hover:bg-blue-50 transform transition-all duration-200 hover:scale-110 hover:shadow-md"
                    style={{ color: 'hsl(var(--apple-blue))' }}
                    onMouseEnter={(e) => {
                      if (e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <Edit size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(food.id)}
                    className="minecraft-action-btn p-2 hover:bg-red-50 transform transition-all duration-200 hover:scale-110 hover:shadow-md"
                    style={{ color: 'hsl(var(--apple-red))' }}
                    disabled={deleteMutation.isPending}
                    onMouseEnter={(e) => {
                      if (e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (e.currentTarget?.style) {
                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'hsl(var(--apple-border))' }}>
          <h4 className="text-sm font-medium mb-3" style={{ color: 'hsl(var(--apple-dark))' }}>
            Quick Actions
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-sm transition-colors"
              style={{ 
                backgroundColor: 'hsl(var(--apple-gray))',
                color: 'hsl(var(--apple-dark))'
              }}
            >
              <Download size={14} className="mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-sm transition-colors"
              style={{ 
                backgroundColor: 'hsl(var(--apple-gray))',
                color: 'hsl(var(--apple-dark))'
              }}
            >
              <Upload size={14} className="mr-1" />
              Import
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
