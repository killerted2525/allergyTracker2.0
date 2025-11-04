import { Calendar, Plus, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Logo Component
interface LogoProps {
  size?: number;
  className?: string;
}

function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(207, 100%, 50%)" />
            <stop offset="100%" stopColor="hsl(248, 53%, 58%)" />
          </linearGradient>
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(4, 100%, 59%)" />
            <stop offset="100%" stopColor="hsl(322, 79%, 65%)" />
          </linearGradient>
        </defs>
        
        <circle
          cx="16"
          cy="16"
          r="15"
          fill="url(#logoGradient)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        
        <rect x="8" y="9" width="16" height="14" rx="2" fill="white" fillOpacity="0.9" />
        <rect x="8" y="9" width="16" height="3" rx="2" fill="white" />
        
        <circle cx="11" cy="15" r="1" fill="hsl(var(--apple-blue))" fillOpacity="0.6" />
        <circle cx="14" cy="15" r="1" fill="hsl(var(--apple-green))" fillOpacity="0.6" />
        <circle cx="17" cy="15" r="1" fill="hsl(var(--apple-orange))" fillOpacity="0.6" />
        <circle cx="21" cy="15" r="1" fill="hsl(var(--apple-purple))" fillOpacity="0.6" />
        
        <circle cx="11" cy="18" r="1" fill="hsl(var(--apple-red))" fillOpacity="0.6" />
        <circle cx="14" cy="18" r="1" fill="hsl(var(--apple-teal))" fillOpacity="0.6" />
        <circle cx="17" cy="18" r="1" fill="hsl(var(--apple-yellow))" fillOpacity="0.6" />
        
        <circle cx="11" cy="21" r="1" fill="hsl(var(--apple-pink))" fillOpacity="0.6" />
        <circle cx="14" cy="21" r="1" fill="hsl(var(--apple-mint))" fillOpacity="0.6" />
        
        <path
          d="M19 17c0-1.5 1-2.5 2.5-2.5S24 15.5 24 17c0 1.5-2.5 4-2.5 4s-2.5-2.5-2.5-4z"
          fill="url(#heartGradient)"
          transform="scale(0.4) translate(14, 8)"
        />
      </svg>
    </div>
  );
}

// Header Component
export function Header() {
  const { isAuthenticated, user } = useAuth();
  const userData = user as any;

  const handleLogout = async () => {
    await apiRequest('POST', '/api/logout');
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    window.location.href = '/';
  };

  return (
    <header className="app-header shadow-sm border-b" style={{ borderColor: 'hsl(var(--apple-border))' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Logo size={32} />
            <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AllergyTracker
            </h1>
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              {userData?.username && (
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                  {userData.username}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Navigation Component
interface NavigationProps {
  activeTab: 'calendar' | 'add-food' | 'manage-foods';
  onTabChange: (tab: 'calendar' | 'add-food' | 'manage-foods') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-white border-b" style={{ borderColor: 'hsl(var(--apple-border))' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          <button
            onClick={() => onTabChange('calendar')}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:text-gray-700'
            }`}
            style={{
              borderColor: activeTab === 'calendar' ? 'hsl(var(--apple-blue))' : 'transparent',
              color: activeTab === 'calendar' ? 'hsl(var(--apple-blue))' : 'hsl(var(--apple-medium))'
            }}
          >
            <Calendar size={16} className="mr-2 inline" />
            Calendar
          </button>
          <button
            onClick={() => onTabChange('add-food')}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'add-food'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:text-gray-700'
            }`}
            style={{
              borderColor: activeTab === 'add-food' ? 'hsl(var(--apple-blue))' : 'transparent',
              color: activeTab === 'add-food' ? 'hsl(var(--apple-blue))' : 'hsl(var(--apple-medium))'
            }}
          >
            <Plus size={16} className="mr-2 inline" />
            Add Food
          </button>
          <button
            onClick={() => onTabChange('manage-foods')}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'manage-foods'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:text-gray-700'
            }`}
            style={{
              borderColor: activeTab === 'manage-foods' ? 'hsl(var(--apple-blue))' : 'transparent',
              color: activeTab === 'manage-foods' ? 'hsl(var(--apple-blue))' : 'hsl(var(--apple-medium))'
            }}
          >
            <Settings size={16} className="mr-2 inline" />
            Manage Foods
          </button>
        </div>
      </div>
    </nav>
  );
}
