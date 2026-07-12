const CLIPBOARD_CLEAR_TIMEOUT_MS = 60_000;

/**
 * Copies text to clipboard and automatically clears it after a timeout.
 * Only clears if the clipboard still contains the copied text (avoids
 * overwriting something the user copied separately).
 */
export async function copyWithAutoClear(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Write may fail if the document isn't focused or lacks permission — safe to ignore.
    return;
  }

  setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === text) {
        await navigator.clipboard.writeText('');
      }
    } catch {
      // Clipboard read may fail if the window lost focus — safe to ignore.
    }
  }, CLIPBOARD_CLEAR_TIMEOUT_MS);
}
