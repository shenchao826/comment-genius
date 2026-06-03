export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number = 1000
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  return function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (!inThrottle) {
      fn.apply(lastThis, lastArgs);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
  };
}

export function useDebounceCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const debouncedFn = debounce(callback, delay) as T;
  return debouncedFn;
}

export function useThrottleCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): T {
  const throttledFn = throttle(callback, limit) as T;
  return throttledFn;
}
