import { useState } from 'react';
import { Calendar, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CalendarExportProps {
  startDate: Date;
  endDate: Date;
}

export default function CalendarExport({ startDate, endDate }: CalendarExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      
      const response = await fetch(`/api/calendar/export?startDate=${start}&endDate=${end}`);
      
      if (!response.ok) {
        throw new Error('Failed to export calendar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = 'food-schedule.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Calendar exported!",
        description: "Your food schedule with recurring events has been downloaded. Open the file to add it to Apple Calendar.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const subscribeUrl = `${window.location.origin}/api/calendar/subscribe`;
      
      // Copy subscription URL to clipboard
      await navigator.clipboard.writeText(subscribeUrl);
      
      toast({
        title: "Subscription URL copied!",
        description: "Add this URL to Apple Calendar for automatic updates when you modify your food schedule.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy subscription URL. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="minecraft-action-btn transform transition-all duration-300 hover:scale-105 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0px)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Export to Apple Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span>Export to Apple Calendar</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">📅 What you'll get:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Recurring events that never end (until you modify them)</li>
              <li>• Automatic reminders on your phone</li>
              <li>• Events sync with all your Apple devices</li>
              <li>• No need to re-export when schedules change</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">📱 Two ways to use:</h4>
            <div className="text-sm text-green-800 space-y-2">
              <div>
                <strong>Option 1: Download File</strong>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>One-time download with current schedule</li>
                  <li>Good for offline use</li>
                </ul>
              </div>
              <div>
                <strong>Option 2: Auto-Update Subscription</strong>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Calendar updates when you modify foods in the app</li>
                  <li>Always stays current automatically</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
            <strong>Date Range:</strong> {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Creating File...' : 'Download Calendar File'}
            </Button>
            
            <Button
              onClick={handleSubscribe}
              variant="outline"
              className="w-full border-green-300 text-green-700 hover:bg-green-50"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Get Auto-Update Subscription
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}