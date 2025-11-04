import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header, Navigation } from "@/components/layout";
import SupportButton from "@/components/support-button";
import CalendarView from "@/pages/calendar";
import AddFoodView from "@/pages/add-food";
import ManageFoodsView from "@/pages/foods";
import { Landing, useAuth } from "@/features/auth";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'calendar' | 'add-food' | 'manage-foods'>('calendar');

  // Show landing page for non-authenticated users
  if (isLoading || !isAuthenticated) {
    return <Landing />;
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: 'linear-gradient(135deg, hsl(var(--apple-gray)) 0%, rgba(240,244,248,0.8) 50%, rgba(248,250,252,0.9) 100%)'
      }}
    >
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6">
        {activeTab === 'calendar' && (
          <CalendarView 
            onNavigateToAddFood={() => setActiveTab('add-food')}
            onNavigateToManageFoods={() => setActiveTab('manage-foods')}
          />
        )}
        {activeTab === 'add-food' && <AddFoodView />}
        {activeTab === 'manage-foods' && <ManageFoodsView />}
      </main>
      
      <SupportButton />
    </div>
  );
}

function App() {
  return (
    <div className="perfect-app gpu-accelerated">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
