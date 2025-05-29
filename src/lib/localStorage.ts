/* eslint-disable @typescript-eslint/no-explicit-any */

export class LocalStorage {
  private storageKey: string;

  constructor(storageKey = 'tournament-data') {
    this.storageKey = storageKey;
  }

  private getData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : {
      stage: [],
      group: [],
      round: [],
      match: [],
      match_game: [],
      participant: []
    };
  }

  private saveData(data: any): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  async insert(table: string, value: any): Promise<number> {
    const data = this.getData();
    if (!data[table]) {
      data[table] = [];
    }
    
    const id = data[table].length > 0 ? Math.max(...data[table].map((item: any) => item.id || 0)) + 1 : 1;
    const newItem = { ...value, id };
    data[table].push(newItem);
    this.saveData(data);
    return id;
  }

  async select(table: string, filter?: any): Promise<any[]> {
    const data = this.getData();
    if (!data[table]) {
      return [];
    }

    let results = data[table];
    
    if (filter) {
      // Handle both object filters and ID filters
      if (typeof filter === 'object' && filter !== null) {
        results = results.filter((item: any) => {
          return Object.keys(filter).every(key => {
            if (filter[key] === null) {
              return item[key] === null || item[key] === undefined;
            }
            return item[key] === filter[key];
          });
        });
      } else {
        // Handle ID filter
        const item = results.find((item: any) => item.id === filter);
        return item ? [item] : [];
      }
    }

    return results;
  }

  async update(table: string, filter: any, value: any): Promise<boolean> {
    const data = this.getData();
    if (!data[table]) {
      return false;
    }

    let updated = false;
    
    if (typeof filter === 'object' && filter !== null) {
      // Handle object filter
      data[table] = data[table].map((item: any) => {
        const matches = Object.keys(filter).every(key => {
          if (filter[key] === null) {
            return item[key] === null || item[key] === undefined;
          }
          return item[key] === filter[key];
        });

        if (matches) {
          updated = true;
          return { ...item, ...value };
        }
        return item;
      });
    } else {
      // Handle ID filter
      data[table] = data[table].map((item: any) => {
        if (item.id === filter) {
          updated = true;
          return { ...item, ...value };
        }
        return item;
      });
    }

    this.saveData(data);
    return updated;
  }

  async delete(table: string, filter?: any): Promise<boolean> {
    const data = this.getData();
    if (!data[table]) {
      return false;
    }

    const originalLength = data[table].length;
    
    if (filter) {
      if (typeof filter === 'object' && filter !== null) {
        // Handle object filter
        data[table] = data[table].filter((item: any) => {
          return !Object.keys(filter).every(key => {
            if (filter[key] === null) {
              return item[key] === null || item[key] === undefined;
            }
            return item[key] === filter[key];
          });
        });
      } else {
        // Handle ID filter
        data[table] = data[table].filter((item: any) => item.id !== filter);
      }
    } else {
      data[table] = [];
    }

    this.saveData(data);
    return data[table].length < originalLength;
  }

  // Clear all tournament data
  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  // Get all data for debugging
  async getAllData(): Promise<any> {
    return this.getData();
  }
} 