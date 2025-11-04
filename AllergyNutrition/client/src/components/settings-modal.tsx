import { useState } from 'react';
import { Settings, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { SoundManager } from '@/lib/sounds';
import { OfflineManager } from '@/lib/offline';

export default function SettingsModal() {
  const soundManager = SoundManager.getInstance();
  const offlineManager = OfflineManager.getInstance();
  
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [isOnline, setIsOnline] = useState(offlineManager.isOnline());

  const handleSoundToggle = (enabled: boolean) => {
    soundManager.setEnabled(enabled);
    setSoundEnabled(enabled);
    
    // Play test sound if enabling
    if (enabled) {
      soundManager.playCompleteSound();
    }
  };

  const testSounds = () => {
    soundManager.playCompleteSound();
    setTimeout(() => soundManager.playUndoSound(), 500);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="minecraft-action-btn">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>App Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Sound Settings */}
          <div className="space-y-3">
            <h4 className="font-medium">Sound Feedback</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-green-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
                <span>Completion sounds</span>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>
            
            {soundEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={testSounds}
                className="w-full"
              >
                Test Sounds
              </Button>
            )}
          </div>

          {/* Offline Status */}
          <div className="space-y-3">
            <h4 className="font-medium">Connection Status</h4>
            <div className="flex items-center space-x-3">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-orange-500" />
              )}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            {!isOnline && (
              <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
                Working offline. Changes will sync when you're back online.
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium">Features</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>✅ Meal planning with categories</div>
              <div>✅ Quick actions and bulk operations</div>
              <div>✅ Offline mode support</div>
              <div>✅ Sound feedback</div>
              <div>✅ 30-second undo feature</div>
              <div>✅ Apple Calendar export</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}