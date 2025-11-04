// Offline Mode Support
interface CachedData {
  foods: any[];
  scheduleEntries: any[];
  lastSync: string;
}

const CACHE_KEY = 'allergytracker_cache';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export class OfflineManager {
  private static instance: OfflineManager;
  private syncQueue: Array<{ method: string; url: string; data?: any; id: string }> = [];

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  // Cache data locally
  cacheData(foods: any[], scheduleEntries: any[]) {
    const cacheData: CachedData = {
      foods,
      scheduleEntries,
      lastSync: new Date().toISOString()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  }

  // Get cached data
  getCachedData(): CachedData | null {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  }

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Add action to sync queue when offline
  queueAction(method: string, url: string, data?: any) {
    const id = Date.now().toString();
    this.syncQueue.push({ method, url, data, id });
    this.saveQueue();
    return id;
  }

  // Save queue to localStorage
  private saveQueue() {
    localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
  }

  // Load queue from localStorage
  private loadQueue() {
    const queue = localStorage.getItem('sync_queue');
    this.syncQueue = queue ? JSON.parse(queue) : [];
  }

  // Sync queued actions when back online
  async syncWhenOnline() {
    if (!this.isOnline() || this.syncQueue.length === 0) return;

    this.loadQueue();
    const results = [];

    for (const action of this.syncQueue) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: action.data ? JSON.stringify(action.data) : undefined
        });
        results.push({ id: action.id, success: response.ok });
      } catch (error) {
        results.push({ id: action.id, success: false });
      }
    }

    // Remove successful actions from queue
    this.syncQueue = this.syncQueue.filter(action => 
      !results.find(r => r.id === action.id && r.success)
    );
    this.saveQueue();

    return results;
  }

  // Initialize offline support
  init() {
    this.loadQueue();
    
    // Sync when coming back online
    window.addEventListener('online', () => {
      this.syncWhenOnline();
    });

    // Periodic sync attempt
    setInterval(() => {
      this.syncWhenOnline();
    }, SYNC_INTERVAL);
  }
}