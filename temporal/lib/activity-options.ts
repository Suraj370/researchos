import type { ActivityOptions } from "@temporalio/workflow";

/**
 * Shared proxyActivities() option objects - plain data, safe to import into
 * workflow code. Each workflow file still calls proxyActivities() itself
 * (Temporal ties that call to its own module), but the retry-policy literals
 * only need to be defined once.
 */

export const EXA_SEARCH_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: "45 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "20 seconds",
    maximumAttempts: 4,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
};

export const NORMALIZE_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 3,
  },
};

export const STORE_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 4,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
};

export const ANALYSIS_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: "90 seconds",
  retry: {
    initialInterval: "2 seconds",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
};

export const AGENT_ACTIVITY_OPTIONS: ActivityOptions = {
  startToCloseTimeout: "90 seconds",
  retry: {
    initialInterval: "2 seconds",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["NonRetryableError"],
  },
};
