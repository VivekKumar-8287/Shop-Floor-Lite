import { storage } from './storage';

export interface QueueItem {
  id: string;
  type: 'downtime_start' | 'downtime_end' | 'checklist_update' | 'alert_acknowledge';
  data: any;
  timestamp: string;
  retryCount: number;
}

class OfflineQueue {
  private queueKey = 'offline_queue';

  async add(item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queue = await this.getQueue();
    const queueItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    queue.push(queueItem);
    await this.saveQueue(queue);
    return queueItem.id;
  }

  async getAll(): Promise<QueueItem[]> {
    return await this.getQueue();
  }

  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  async remove(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(item => item.id !== id);
    await this.saveQueue(filtered);
  }

  async clear(): Promise<void> {
    await storage.removeItem(this.queueKey);
  }

  async incrementRetry(id: string): Promise<void> {
    const queue = await this.getQueue();
    const item = queue.find(item => item.id === id);
    if (item) {
      item.retryCount += 1;
      await this.saveQueue(queue);
    }
  }

  private async getQueue(): Promise<QueueItem[]> {
    const queueStr = await storage.getItem(this.queueKey);
    return queueStr ? JSON.parse(queueStr) : [];
  }

  private async saveQueue(queue: QueueItem[]): Promise<void> {
    await storage.setItem(this.queueKey, JSON.stringify(queue));
  }
}

export const offlineQueue = new OfflineQueue();