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

  async insert(table: string, value: any): Promise<any> {
    const data = this.getData();
    if (!data[table]) {
      data[table] = [];
    }

    // Handle bulk insert (array of values) — returns boolean
    if (Array.isArray(value)) {
      for (const item of value) {
        const id = data[table].length > 0 ? Math.max(...data[table].map((i: any) => i.id || 0)) + 1 : 1;
        data[table].push({ ...item, id });
      }
      this.saveData(data);
      return true;
    }

    // Single insert — returns the new ID
    const id = data[table].length > 0 ? Math.max(...data[table].map((item: any) => item.id || 0)) + 1 : 1;
    const newItem = { ...value, id };
    data[table].push(newItem);
    this.saveData(data);
    return id;
  }

  async select(table: string, filter?: any): Promise<any> {
    const data = this.getData();
    if (!data[table]) {
      return null;
    }

    let results = data[table];

    if (filter !== undefined && filter !== null) {
      // Handle both object filters and ID filters
      if (typeof filter === 'object') {
        results = results.filter((item: any) => {
          return Object.keys(filter).every((key: string) => {
            if (filter[key] === null) {
              return item[key] === null || item[key] === undefined;
            }
            return item[key] === filter[key];
          });
        });
        return results.length > 0 ? results : null;
      } else {
        // ID filter — return single object or null (per CrudInterface contract)
        const item = results.find((item: any) => item.id === filter);
        return item || null;
      }
    }

    return results.length > 0 ? results : null;
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
      data[table] = [];
      this.saveData(data);
      return true; // Emptying a non-existent table is still successful
    }

    if (filter) {
      const originalLength = data[table].length;
      if (typeof filter === 'object' && filter !== null) {
        data[table] = data[table].filter((item: any) => {
          return !Object.keys(filter).every((key: string) => {
            if (filter[key] === null) {
              return item[key] === null || item[key] === undefined;
            }
            return item[key] === filter[key];
          });
        });
      } else {
        data[table] = data[table].filter((item: any) => item.id !== filter);
      }
      this.saveData(data);
      return data[table].length < originalLength;
    } else {
      data[table] = [];
      this.saveData(data);
      return true;
    }
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