import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening
  successThreshold: number;     // Number of successes to close from half-open
  timeout: number;              // Time in ms before trying again (half-open)
  monitoringPeriod: number;     // Time window for counting failures
}

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextRetryAt?: Date;
}

interface CircuitData {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: number;
  lastSuccess?: number;
  openedAt?: number;
  failureTimestamps: number[];
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  monitoringPeriod: 60000, // 1 minute
};

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, CircuitData> = new Map();
  private configs: Map<string, CircuitBreakerConfig> = new Map();

  /**
   * Configure circuit breaker for a specific key
   */
  configure(key: string, config: Partial<CircuitBreakerConfig>): void {
    this.configs.set(key, { ...DEFAULT_CONFIG, ...config });
  }

  /**
   * Check if request is allowed through the circuit
   */
  isAllowed(key: string): boolean {
    const circuit = this.getOrCreateCircuit(key);
    const config = this.getConfig(key);

    this.cleanOldFailures(circuit, config);

    switch (circuit.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        const now = Date.now();
        if (circuit.openedAt && now - circuit.openedAt >= config.timeout) {
          // Transition to half-open
          circuit.state = CircuitState.HALF_OPEN;
          circuit.successes = 0;
          this.logger.log(`Circuit ${key} transitioned to HALF_OPEN`);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(key: string): void {
    const circuit = this.getOrCreateCircuit(key);
    const config = this.getConfig(key);

    circuit.lastSuccess = Date.now();
    circuit.successes++;

    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.successes >= config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.failureTimestamps = [];
        this.logger.log(`Circuit ${key} CLOSED after recovery`);
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(key: string, error?: Error): void {
    const circuit = this.getOrCreateCircuit(key);
    const config = this.getConfig(key);
    const now = Date.now();

    circuit.lastFailure = now;
    circuit.failures++;
    circuit.failureTimestamps.push(now);

    this.cleanOldFailures(circuit, config);

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open returns to open
      circuit.state = CircuitState.OPEN;
      circuit.openedAt = now;
      this.logger.warn(`Circuit ${key} OPENED again after failure in half-open: ${error?.message}`);
    } else if (circuit.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      const recentFailures = circuit.failureTimestamps.length;
      if (recentFailures >= config.failureThreshold) {
        circuit.state = CircuitState.OPEN;
        circuit.openedAt = now;
        this.logger.warn(
          `Circuit ${key} OPENED after ${recentFailures} failures: ${error?.message}`,
        );
      }
    }
  }

  /**
   * Get circuit status
   */
  getStatus(key: string): CircuitStatus {
    const circuit = this.getOrCreateCircuit(key);
    const config = this.getConfig(key);

    this.cleanOldFailures(circuit, config);

    const status: CircuitStatus = {
      state: circuit.state,
      failures: circuit.failureTimestamps.length,
      successes: circuit.successes,
    };

    if (circuit.lastFailure) {
      status.lastFailure = new Date(circuit.lastFailure);
    }

    if (circuit.lastSuccess) {
      status.lastSuccess = new Date(circuit.lastSuccess);
    }

    if (circuit.state === CircuitState.OPEN && circuit.openedAt) {
      status.nextRetryAt = new Date(circuit.openedAt + config.timeout);
    }

    return status;
  }

  /**
   * Manually reset a circuit
   */
  reset(key: string): void {
    this.circuits.delete(key);
    this.logger.log(`Circuit ${key} manually reset`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    if (!this.isAllowed(key)) {
      if (fallback) {
        this.logger.log(`Circuit ${key} is OPEN, using fallback`);
        return fallback();
      }
      throw new Error(`Circuit breaker is OPEN for ${key}. Service temporarily unavailable.`);
    }

    try {
      const result = await fn();
      this.recordSuccess(key);
      return result;
    } catch (error) {
      this.recordFailure(key, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute with automatic retry
   */
  async executeWithRetry<T>(
    key: string,
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      backoffMultiplier?: number;
      retryOn?: (error: Error) => boolean;
    } = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      backoffMultiplier = 2,
      retryOn = () => true,
    } = options;

    let lastError: Error | null = null;
    let delay = retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (!this.isAllowed(key)) {
        throw new Error(`Circuit breaker is OPEN for ${key}. Service temporarily unavailable.`);
      }

      try {
        const result = await fn();
        this.recordSuccess(key);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const shouldRetry = attempt < maxRetries && retryOn(lastError);

        if (shouldRetry) {
          this.logger.warn(
            `Attempt ${attempt + 1}/${maxRetries + 1} failed for ${key}: ${lastError.message}. ` +
            `Retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
          delay *= backoffMultiplier;
        } else {
          this.recordFailure(key, lastError);
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }

  private getOrCreateCircuit(key: string): CircuitData {
    let circuit = this.circuits.get(key);
    if (!circuit) {
      circuit = {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        failureTimestamps: [],
      };
      this.circuits.set(key, circuit);
    }
    return circuit;
  }

  private getConfig(key: string): CircuitBreakerConfig {
    return this.configs.get(key) || DEFAULT_CONFIG;
  }

  private cleanOldFailures(circuit: CircuitData, config: CircuitBreakerConfig): void {
    const cutoff = Date.now() - config.monitoringPeriod;
    circuit.failureTimestamps = circuit.failureTimestamps.filter(ts => ts > cutoff);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
