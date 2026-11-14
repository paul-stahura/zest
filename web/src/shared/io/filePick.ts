/**
 * Opens a file picker and resolves the first selected file, or `null` if the user cancels.
 *
 * Uses a window `focus` reconciliation pass so dismissal still resolves even when the input `cancel` event does not fire.
 */
export function pickSingleFile(accept?: string): Promise<File | null> {
  return new Promise((resolve) => {
    let settled = false;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    if (accept !== undefined && accept.length > 0) {
      input.accept = accept;
    }

    const cleanup = (): void => {
      window.removeEventListener("focus", onWindowFocus, true);
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      window.clearTimeout(failsafeTimer);
    };

    const settle = (value: File | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const onChange = (): void => {
      settle(input.files?.item(0) ?? null);
    };

    const onCancel = (): void => {
      settle(null);
    };

    const onWindowFocus = (): void => {
      window.setTimeout(() => {
        if (!settled) {
          settle(input.files?.item(0) ?? null);
        }
      }, 500);
    };

    const failsafeTimer = window.setTimeout(() => {
      if (!settled) {
        settle(input.files?.item(0) ?? null);
      }
    }, 120_000);

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    window.addEventListener("focus", onWindowFocus, true);
    input.click();
  });
}
