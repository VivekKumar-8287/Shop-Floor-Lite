import { storage } from './storage';
import { downtimeApi, checklistApi } from './api';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

class SyncManager {
  private isOnline = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Check initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected || false;

    // Subscribe to network changes
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;
      
      if (wasOffline && this.isOnline) {
        this.syncPendingItems();
      }
    });

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingItems();
      }
    }, 30000); // Sync every 30 seconds
  }

  async syncPendingItems() {
    try {
      const pendingItems = await this.getPendingItems();
      
      for (const item of pendingItems) {
        await this.syncItem(item);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private async getPendingItems(): Promise<any[]> {
    const pending = await storage.getItem('pending_downtime');
    return pending ? JSON.parse(pending) : [];
  }

  private async savePendingItems(items: any[]) {
    await storage.setItem('pending_downtime', JSON.stringify(items));
  }

  private async syncItem(item: any) {
  try {
    if (item.type === 'downtime_start') {
      // REAL BACKEND CALL
      const response = await downtimeApi.start(item.data);
      
      // Update local entry with backend ID
      await this.updateLocalEntry(item.id, {
        synced: true,
        backendId: response.data.id,
      });
      
      await this.removePendingItem(item.id);
      
    } else if (item.type === 'downtime_end') {
      // Use the backend ID if available
      const downtimeId = item.data.backendId || item.data.id;
      const response = await downtimeApi.end(downtimeId, item.data);
      await this.removePendingItem(item.id);
      
    } else if (item.type === 'checklist_update') {
      // REAL BACKEND CALL for checklist
      const response = await checklistApi.updateItem(item.data.itemId, item.data);
      await this.removePendingItem(item.id);
    }
  } catch (error) {
    console.error('Failed to sync item:', item.id, error);
    
    // If it's a permanent error (not network), remove from queue
    if (error.response?.status >= 400 && error.response?.status < 500) {
      await this.removePendingItem(item.id);
    }
  }
}

  private async removePendingItem(id: string) {
    const pendingItems = await this.getPendingItems();
    const filteredItems = pendingItems.filter(item => item.id !== id);
    await this.savePendingItems(filteredItems);
  }

  async addToQueue(type: string, data: any) {
    const pendingItems = await this.getPendingItems();
    const newItem = {
      id: 'pending-' + Date.now(),
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    
    pendingItems.push(newItem);
    await this.savePendingItems(pendingItems);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncItem(newItem);
    }
  }

  getPendingCount(): Promise<number> {
    return this.getPendingItems().then(items => items.length);
  }

  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncOfflineData = async () => {
  await syncManager.syncPendingItems();
};

export const syncManager = new SyncManager();