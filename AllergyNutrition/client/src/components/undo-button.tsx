import { useState, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UndoManager } from '@/lib/undo';
import { SoundManager } from '@/lib/sounds';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function UndoButton() {
  const [lastAction, setLastAction] = useState(UndoManager.getInstance().getLastAction());
  const [timeLeft, setTimeLeft] = useState(30);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const undoManager = UndoManager.getInstance();
  const soundManager = SoundManager.getInstance();

  const undoMutation = useMutation({
    mutationFn: async (action: any) => {
      if (action.type === 'completion') {
        return apiRequest('PATCH', `/api/schedule/${action.data.entryId}`, {
          isCompleted: action.data.previousState,
          completedAt: action.data.previousState ? new Date().toISOString() : null
        });
      } else if (action.type === 'bulk_completion') {
        const promises = action.data.entryIds.map((id: number) =>
          apiRequest('PATCH', `/api/schedule/${id}`, {
            isCompleted: action.data.previousState,
            completedAt: action.data.previousState ? new Date().toISOString() : null
          })
        );
        return Promise.all(promises);
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      undoManager.removeAction(action.id);
      soundManager.playUndoSound();
      
      const count = action.type === 'bulk_completion' ? action.data.entryIds.length : 1;
      toast({
        title: "Action undone",
        description: `${count} food${count > 1 ? 's' : ''} reverted successfully`,
      });
      
      setLastAction(undoManager.getLastAction());
    },
    onError: () => {
      soundManager.playErrorSound();
      toast({
        title: "Undo failed",
        description: "Could not undo the last action",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const action = undoManager.getLastAction();
      setLastAction(action);
      
      if (action && undoManager.canUndo(action)) {
        const secondsLeft = Math.ceil((action.timestamp + 30000 - Date.now()) / 1000);
        setTimeLeft(Math.max(0, secondsLeft));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!lastAction || !undoManager.canUndo(lastAction)) {
    return null;
  }

  const handleUndo = () => {
    undoMutation.mutate(lastAction);
  };

  const getActionDescription = () => {
    if (lastAction.type === 'completion') {
      return 'food completion';
    } else if (lastAction.type === 'bulk_completion') {
      const count = lastAction.data.entryIds.length;
      return `${count} food completions`;
    }
    return 'action';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleUndo}
        disabled={undoMutation.isPending}
        className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg minecraft-action-btn text-xs sm:text-sm px-2 sm:px-4 py-2"
      >
        <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
        <span>Undo {getActionDescription()}</span>
        <span className="ml-1">({timeLeft}s)</span>
      </Button>
    </div>
  );
}