/**
 * Performance Monitor Service
 *
 * Provides performance monitoring and optimization for panel type operations
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.agentCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId) {
    this.metrics.set(operationId, {
      startTime: Date.now(),
      endTime: null,
      duration: null,
      metadata: {},
    });
  }

  /**
   * End timing an operation
   */
  endTimer(operationId, metadata = {}) {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`Performance metric not found: ${operationId}`);
      return null;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.metadata = { ...metric.metadata, ...metadata };

    return metric;
  }

  /**
   * Get performance metrics for an operation
   */
  getMetrics(operationId) {
    return this.metrics.get(operationId);
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics() {
    const results = {};
    for (const [id, metric] of this.metrics.entries()) {
      results[id] = metric;
    }
    return results;
  }

  /**
   * Cache an agent for reuse
   */
  cacheAgent(cacheKey, agent) {
    this.agentCache.set(cacheKey, {
      agent,
      cachedAt: Date.now(),
      accessCount: 0,
    });
  }

  /**
   * Get cached agent
   */
  getCachedAgent(cacheKey) {
    const cached = this.agentCache.get(cacheKey);
    if (cached) {
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      this.cacheHits++;
      return cached.agent;
    }
    this.cacheMisses++;
    return null;
  }

  /**
   * Clear agent cache
   */
  clearAgentCache() {
    this.agentCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.agentCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate:
        this.cacheHits + this.cacheMisses > 0
          ? (
              (this.cacheHits / (this.cacheHits + this.cacheMisses)) *
              100
            ).toFixed(2) + "%"
          : "0%",
    };
  }

  /**
   * Monitor panel type specific operations
   */
  monitorPanelTypeOperation(panelType, operationType, duration, metadata = {}) {
    const key = `${panelType}_${operationType}`;
    const existing = this.metrics.get(key) || {
      operations: [],
      averageDuration: 0,
    };

    existing.operations.push({
      duration,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only last 100 operations for memory efficiency
    if (existing.operations.length > 100) {
      existing.operations = existing.operations.slice(-100);
    }

    // Calculate average duration
    existing.averageDuration =
      existing.operations.reduce((sum, op) => sum + op.duration, 0) /
      existing.operations.length;

    this.metrics.set(key, existing);
  }

  /**
   * Get performance summary for panel types
   */
  getPanelTypePerformanceSummary() {
    const summary = {
      discussion: { operations: {}, totalOperations: 0 },
      security: { operations: {}, totalOperations: 0 },
      techreview: { operations: {}, totalOperations: 0 },
    };

    for (const [key, metric] of this.metrics.entries()) {
      if (key.includes("_")) {
        const [panelType, operationType] = key.split("_");
        if (summary[panelType] && metric.operations) {
          summary[panelType].operations[operationType] = {
            count: metric.operations.length,
            averageDuration: metric.averageDuration,
            lastOperation:
              metric.operations[metric.operations.length - 1]?.timestamp,
          };
          summary[panelType].totalOperations += metric.operations.length;
        }
      }
    }

    return summary;
  }

  /**
   * Check if performance is within expected bounds
   */
  validatePerformance(panelType, expectedMaxDuration = 240000) {
    // 4 minutes default
    const summary = this.getPanelTypePerformanceSummary();
    const panelSummary = summary[panelType];

    if (!panelSummary || !panelSummary.operations.pipeline_execution) {
      return { valid: true, message: "No performance data available" };
    }

    const avgDuration =
      panelSummary.operations.pipeline_execution.averageDuration;

    if (avgDuration > expectedMaxDuration) {
      return {
        valid: false,
        message: `Performance degraded: ${panelType} panel averaging ${(
          avgDuration / 1000
        ).toFixed(1)}s, expected under ${(expectedMaxDuration / 1000).toFixed(
          1
        )}s`,
        actualDuration: avgDuration,
        expectedDuration: expectedMaxDuration,
      };
    }

    return {
      valid: true,
      message: `Performance within bounds: ${(avgDuration / 1000).toFixed(1)}s`,
      actualDuration: avgDuration,
      expectedDuration: expectedMaxDuration,
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.clearAgentCache();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
