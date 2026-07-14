// src/hooks/usePollUntilStatus.js
// Generic "poll until some external status resolves" hook.
// Domain-agnostic by design: the caller supplies checkFn/isSuccess/
// isTerminalFailure, so this can back guardian-consent, payment status,
// admin-approval status, etc. without any consent-specific knowledge here.
import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_POLL_SCHEDULE = [
  { afterMs: 0, intervalMs: 10_000 },
  { afterMs: 120_000, intervalMs: 30_000 },
  { afterMs: 600_000, intervalMs: 60_000 },
];

// Extra delay layered on top of the current tier's interval after a network
// failure, so a flaky connection doesn't hammer the server at the normal cadence.
const CONNECTION_ERROR_EXTRA_DELAY_MS = 5_000;

function intervalForElapsed(schedule, elapsedMs) {
  let interval = schedule[0]?.intervalMs ?? 10_000;
  for (const tier of schedule) {
    if (elapsedMs >= tier.afterMs) interval = tier.intervalMs;
  }
  return interval;
}

function isExpiredNow(expiresAt) {
  if (!expiresAt) return false;
  const parsed = Date.parse(expiresAt);
  return !Number.isNaN(parsed) && Date.now() >= parsed;
}

export default function usePollUntilStatus({
  checkFn,
  isSuccess,
  isTerminalFailure,
  expiresAt,
  schedule = DEFAULT_POLL_SCHEDULE,
  onSuccess,
}) {
  const [status, setStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(() => !isExpiredNow(expiresAt));
  const [hasConnectionTrouble, setHasConnectionTrouble] = useState(false);
  const [isExpired, setIsExpired] = useState(() => isExpiredNow(expiresAt));

  // Latest-value refs so the polling loop never closes over stale props.
  const propsRef = useRef({});
  propsRef.current = { checkFn, isSuccess, isTerminalFailure, expiresAt, schedule, onSuccess };

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const stoppedRef = useRef(false);
  const stopReasonRef = useRef(null); // "success" | "terminalFailure" | "expired" | null
  const runCheckRef = useRef(null);
  // Guards against overlapping checkFn calls — most notably React
  // StrictMode's dev-only double-invoke of mount effects, which would
  // otherwise fire two real checkFn calls back-to-back on mount.
  const inFlightRef = useRef(false);

  const stop = useCallback((reason) => {
    stoppedRef.current = true;
    stopReasonRef.current = reason;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const scheduleNext = useCallback((extraDelayMs = 0) => {
    if (stoppedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    const delay = intervalForElapsed(propsRef.current.schedule, elapsed) + extraDelayMs;
    timerRef.current = setTimeout(() => runCheckRef.current?.(), delay);
  }, []);

  const runCheck = useCallback(async () => {
    if (stoppedRef.current) return;
    if (inFlightRef.current) return;
    if (typeof document !== "undefined" && document.hidden) return;

    if (isExpiredNow(propsRef.current.expiresAt)) {
      setIsExpired(true);
      stop("expired");
      return;
    }

    inFlightRef.current = true;
    try {
      const result = await propsRef.current.checkFn();
      if (stoppedRef.current) return;

      setStatus(result);
      setHasConnectionTrouble(false);

      if (propsRef.current.isSuccess?.(result)) {
        stop("success");
        propsRef.current.onSuccess?.(result);
        return;
      }

      if (propsRef.current.isTerminalFailure?.(result)) {
        stop("terminalFailure");
        return;
      }

      if (isExpiredNow(propsRef.current.expiresAt)) {
        setIsExpired(true);
        stop("expired");
        return;
      }

      scheduleNext();
    } catch {
      if (stoppedRef.current) return;
      setHasConnectionTrouble(true);
      scheduleNext(CONNECTION_ERROR_EXTRA_DELAY_MS);
    } finally {
      inFlightRef.current = false;
    }
  }, [stop, scheduleNext]);

  runCheckRef.current = runCheck;

  const checkNow = useCallback(() => {
    if (stoppedRef.current) return;
    startTimeRef.current = Date.now();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    runCheckRef.current?.();
  }, []);

  // Pause entirely while backgrounded; on return, fire one immediate check
  // then resume the schedule at the tier for total elapsed time (no restart).
  useEffect(() => {
    function handleVisibilityChange() {
      if (stoppedRef.current) return;
      if (document.hidden) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        runCheckRef.current?.();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Kick off polling on mount.
  useEffect(() => {
    stoppedRef.current = false;
    if (isExpiredNow(propsRef.current.expiresAt)) {
      setIsExpired(true);
      setIsPolling(false);
      stopReasonRef.current = "expired";
      return;
    }
    runCheckRef.current?.();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // If the caller supplies a fresh (future) expiresAt after we stopped solely
  // because the previous one expired, resume polling automatically — this is
  // what lets an "expired -> request again" flow pick back up without the
  // caller having to remount the hook.
  const prevExpiresAtRef = useRef(expiresAt);
  useEffect(() => {
    const changed = prevExpiresAtRef.current !== expiresAt;
    prevExpiresAtRef.current = expiresAt;
    if (!changed) return;
    if (stopReasonRef.current === "expired" && expiresAt && !isExpiredNow(expiresAt)) {
      stoppedRef.current = false;
      stopReasonRef.current = null;
      setIsExpired(false);
      setHasConnectionTrouble(false);
      setIsPolling(true);
      startTimeRef.current = Date.now();
      runCheckRef.current?.();
    }
  }, [expiresAt]);

  return { status, isPolling, checkNow, hasConnectionTrouble, isExpired };
}
