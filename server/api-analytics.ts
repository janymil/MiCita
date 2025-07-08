
export interface APICallRecord {
  id: string;
  timestamp: Date;
  endpoint: string;
  query: string;
  status: 'success' | 'error';
  responseTime: number;
  resultCount?: number;
  apiType: 'search' | 'photo' | 'details';
  cost?: number; // Estimated cost in USD
}

export class APIAnalytics {
  private static instance: APIAnalytics;
  private apiCalls: APICallRecord[] = [];
  private readonly maxRecords = 1000; // Keep last 1000 records

  static getInstance(): APIAnalytics {
    if (!APIAnalytics.instance) {
      APIAnalytics.instance = new APIAnalytics();
    }
    return APIAnalytics.instance;
  }

  recordAPICall(record: Omit<APICallRecord, 'id' | 'timestamp'>): void {
    const apiCall: APICallRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      ...record
    };

    this.apiCalls.unshift(apiCall);
    
    // Keep only the most recent records
    if (this.apiCalls.length > this.maxRecords) {
      this.apiCalls = this.apiCalls.slice(0, this.maxRecords);
    }

    console.log(`API Call recorded: ${record.apiType} - ${record.endpoint} (${record.status})`);
  }

  getRecentCalls(limit: number = 50): APICallRecord[] {
    return this.apiCalls.slice(0, limit);
  }

  getStats(): {
    totalCalls: number;
    todayCalls: number;
    hourlyStats: { hour: string; calls: number; cost: number }[];
    apiTypeStats: { type: string; calls: number; cost: number }[];
    averageResponseTime: number;
    successRate: number;
    estimatedCost: number;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const todayCalls = this.apiCalls.filter(call => call.timestamp >= today);
    const last24HoursCalls = this.apiCalls.filter(call => call.timestamp >= last24Hours);

    // Hourly stats for last 24 hours
    const hourlyStats: { hour: string; calls: number; cost: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourCalls = this.apiCalls.filter(call => 
        call.timestamp >= hourStart && call.timestamp < hourEnd
      );

      hourlyStats.push({
        hour: hourStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        calls: hourCalls.length,
        cost: hourCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
      });
    }

    // API type stats
    const apiTypeMap = new Map<string, { calls: number; cost: number }>();
    this.apiCalls.forEach(call => {
      const existing = apiTypeMap.get(call.apiType) || { calls: 0, cost: 0 };
      apiTypeMap.set(call.apiType, {
        calls: existing.calls + 1,
        cost: existing.cost + (call.cost || 0)
      });
    });

    const apiTypeStats = Array.from(apiTypeMap.entries()).map(([type, stats]) => ({
      type,
      calls: stats.calls,
      cost: stats.cost
    }));

    // Calculate averages
    const totalResponseTime = this.apiCalls.reduce((sum, call) => sum + call.responseTime, 0);
    const averageResponseTime = this.apiCalls.length > 0 ? totalResponseTime / this.apiCalls.length : 0;

    const successCalls = this.apiCalls.filter(call => call.status === 'success').length;
    const successRate = this.apiCalls.length > 0 ? (successCalls / this.apiCalls.length) * 100 : 0;

    const estimatedCost = this.apiCalls.reduce((sum, call) => sum + (call.cost || 0), 0);

    return {
      totalCalls: this.apiCalls.length,
      todayCalls: todayCalls.length,
      hourlyStats,
      apiTypeStats,
      averageResponseTime,
      successRate,
      estimatedCost
    };
  }

  clearStats(): void {
    this.apiCalls = [];
  }
}

export const apiAnalytics = APIAnalytics.getInstance();
