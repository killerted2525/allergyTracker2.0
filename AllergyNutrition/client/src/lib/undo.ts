// Undo System
interface UndoAction {
  id: string;
  type: 'completion' | 'bulk_completion';
  timestamp: number;
  data: {
    entryId?: number;
    entryIds?: number[];
    previousState: boolean;
  };
}

export class UndoManager {
  private static instance: UndoManager;
  private undoStack: UndoAction[] = [];
  private maxUndoActions = 10;

  static getInstance(): UndoManager {
    if (!UndoManager.instance) {
      UndoManager.instance = new UndoManager();
    }
    return UndoManager.instance;
  }

  // Record an action that can be undone
  recordAction(type: UndoAction['type'], data: UndoAction['data']): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const action: UndoAction = {
      id,
      type,
      timestamp: Date.now(),
      data
    };

    this.undoStack.unshift(action);
    
    // Keep only recent actions
    if (this.undoStack.length > this.maxUndoActions) {
      this.undoStack = this.undoStack.slice(0, this.maxUndoActions);
    }

    return id;
  }

  // Get the most recent action that can be undone
  getLastAction(): UndoAction | null {
    return this.undoStack.length > 0 ? this.undoStack[0] : null;
  }

  // Remove an action from the undo stack (after successful undo)
  removeAction(id: string) {
    this.undoStack = this.undoStack.filter(action => action.id !== id);
  }

  // Clear all undo actions
  clear() {
    this.undoStack = [];
  }

  // Check if an action is recent enough to undo (within 30 seconds)
  canUndo(action: UndoAction): boolean {
    const thirtySecondsAgo = Date.now() - 30000;
    return action.timestamp > thirtySecondsAgo;
  }

  // Get count of available undo actions
  getUndoCount(): number {
    return this.undoStack.filter(action => this.canUndo(action)).length;
  }
}