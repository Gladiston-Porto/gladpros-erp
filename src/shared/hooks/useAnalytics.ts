// src/hooks/useAnalytics.ts
import { useState, useEffect } from 'react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    blockedUsers: number;
    totalClients: number;
    totalProposals: number;
  };
  charts: {
    loginAttempts: Array<{
      date: string;
      attempts: number;
      successful: number;
      failed: number;
    }>;
    auditActions: Array<{
      action: string;
      count: number;
    }>;
    clientsByStatus: Array<{
      status: string;
      count: number;
    }>;
    proposalsByStatus: Array<{
      status: string;
      count: number;
    }>;
    loginsByHour: Array<{
      hour: number;
      count: number;
    }>;
  };
  period: string;
}

// Simple in-memory cache
const cache = new Map<string, { data: AnalyticsData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAnalytics(period: string = '30d') {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // Check cache first
        const cacheKey = `analytics-${period}`;
        const cached = cache.get(cacheKey);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setData(cached.data);
          setError(null);
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/analytics?period=${period}`);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const raw = await response.json();
        const analyticsData = raw.data ?? raw;

        // Cache the result
        cache.set(cacheKey, { data: analyticsData, timestamp: now });

        setData(analyticsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  const refetch = () => {
    // Clear cache for this period
    const cacheKey = `analytics-${period}`;
    cache.delete(cacheKey);
    setLoading(true);
    // Re-trigger effect
    setData(null);
  };

  return { data, loading, error, refetch };
}
