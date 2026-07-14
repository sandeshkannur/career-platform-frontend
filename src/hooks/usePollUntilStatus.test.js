// src/hooks/usePollUntilStatus.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import usePollUntilStatus from "./usePollUntilStatus";

function setDocumentHidden(hidden) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
}

// Fake timers don't auto-flush the microtasks queued by an in-flight
// checkFn promise; advancing by 0ms still pumps pending microtasks between
// timer ticks, so this is the standard way to "let the current check settle"
// under vi.useFakeTimers() without waiting on real wall-clock time.
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("usePollUntilStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDocumentHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls immediately on mount and advances through backoff tiers", async () => {
    const checkFn = vi.fn().mockResolvedValue({ state: "sent" });
    const schedule = [
      { afterMs: 0, intervalMs: 1_000 },
      { afterMs: 5_000, intervalMs: 2_000 },
    ];

    renderHook(() =>
      usePollUntilStatus({
        checkFn,
        isSuccess: (s) => s.state === "verified",
        schedule,
      })
    );

    await flush();
    expect(checkFn).toHaveBeenCalledTimes(1);

    // Tier 1: interval 1000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(3);

    // total elapsed ~4000ms, still tier 1
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(4);

    // This check fires at elapsed=4000 (tier 1), but at the moment it
    // resolves elapsed=5000 which crosses the tier-2 boundary, so the
    // check *after this one* is scheduled using the tier-2 interval.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(5);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(6);

    // Next interval is now tier 2 (2000ms): advancing only 1000ms must NOT
    // trigger another call.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(6);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(7);
  });

  it("stops polling and calls onSuccess once isSuccess is true", async () => {
    const checkFn = vi
      .fn()
      .mockResolvedValueOnce({ state: "sent" })
      .mockResolvedValueOnce({ state: "verified" });
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      usePollUntilStatus({
        checkFn,
        isSuccess: (s) => s.state === "verified",
        schedule: [{ afterMs: 0, intervalMs: 1_000 }],
        onSuccess,
      })
    );

    await flush();
    expect(checkFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(2);
    expect(result.current.isPolling).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith({ state: "verified" });

    // No further checks after success.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(2);
  });

  it("stops polling once expiresAt has passed", async () => {
    const checkFn = vi.fn().mockResolvedValue({ state: "sent" });
    const expiresAt = new Date(Date.now() + 500).toISOString();

    const { result } = renderHook(() =>
      usePollUntilStatus({
        checkFn,
        isSuccess: (s) => s.state === "verified",
        expiresAt,
        schedule: [{ afterMs: 0, intervalMs: 1_000 }],
      })
    );

    await flush();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.isPolling).toBe(false);
  });

  it("pauses while document.hidden is true and resumes with an immediate check on visibility", async () => {
    const checkFn = vi.fn().mockResolvedValue({ state: "sent" });

    renderHook(() =>
      usePollUntilStatus({
        checkFn,
        isSuccess: (s) => s.state === "verified",
        schedule: [{ afterMs: 0, intervalMs: 1_000 }],
      })
    );

    await flush();
    expect(checkFn).toHaveBeenCalledTimes(1);

    setDocumentHidden(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // While hidden, advancing time must not trigger further checks.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(1);

    // Becoming visible fires one immediate check.
    setDocumentHidden(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();
    expect(checkFn).toHaveBeenCalledTimes(2);
  });

  it("marks hasConnectionTrouble on a checkFn rejection without treating it as a real failure", async () => {
    const checkFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ state: "sent" });
    const isTerminalFailure = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() =>
      usePollUntilStatus({
        checkFn,
        isSuccess: (s) => s.state === "verified",
        isTerminalFailure,
        schedule: [{ afterMs: 0, intervalMs: 1_000 }],
      })
    );

    await flush();
    expect(checkFn).toHaveBeenCalledTimes(1);
    expect(result.current.hasConnectionTrouble).toBe(true);
    expect(result.current.isPolling).toBe(true);
    expect(isTerminalFailure).not.toHaveBeenCalled();

    // Next attempt is delayed by the normal interval PLUS the connection
    // error backoff, so it must not have fired yet at exactly 1000ms.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(2);
    expect(result.current.hasConnectionTrouble).toBe(false);
  });

  it("checkNow performs an immediate check and resets the backoff timer", async () => {
    const checkFn = vi.fn().mockResolvedValue({ state: "sent" });

    const { result } = renderHook(() =>
      usePollUntilStatus({
        checkFn,
        isSuccess: (s) => s.state === "verified",
        schedule: [{ afterMs: 0, intervalMs: 10_000 }],
      })
    );

    await flush();
    expect(checkFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.checkNow();
    });
    await flush();
    expect(checkFn).toHaveBeenCalledTimes(2);

    // Backoff restarted from checkNow's call time: advancing only the
    // remaining ~6000ms of the original tier must not trigger a 3rd call.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(3);
  });

  it("stops on isTerminalFailure and does not poll further", async () => {
    const checkFn = vi.fn().mockResolvedValue({ state: "rejected" });

    const { result } = renderHook(() =>
      usePollUntilStatus({
        checkFn,
        isSuccess: (s) => s.state === "verified",
        isTerminalFailure: (s) => s.state === "rejected",
        schedule: [{ afterMs: 0, intervalMs: 1_000 }],
      })
    );

    await flush();
    expect(checkFn).toHaveBeenCalledTimes(1);
    expect(result.current.isPolling).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(checkFn).toHaveBeenCalledTimes(1);
  });
});
