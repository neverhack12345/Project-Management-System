/**
 * Transient status line (matches vault #vaultFlash behavior).
 * @param {HTMLElement | null} el
 * @param {{ successClearMs?: number }} [options]
 * @returns {{ show: (message: string, opts?: { error?: boolean; clearAfterMs?: number | null }) => void }}
 */
export function createFlash(el, options = {}) {
  const defaultSuccessMs = options.successClearMs ?? 5000;
  let timer = null;
  function clearTimer() {
    if (timer) window.clearTimeout(timer);
    timer = null;
  }
  return {
    show(message, opts = {}) {
      if (!el) return;
      const text = message == null ? "" : String(message);
      const error = Boolean(opts.error);
      const clearAfter =
        opts.clearAfterMs !== undefined
          ? opts.clearAfterMs
          : error
            ? null
            : defaultSuccessMs;
      clearTimer();
      el.textContent = text;
      el.classList.toggle("error", error);
      if (text && clearAfter != null && clearAfter >= 0) {
        timer = window.setTimeout(() => {
          el.textContent = "";
          el.classList.remove("error");
          timer = null;
        }, clearAfter);
      }
    }
  };
}
