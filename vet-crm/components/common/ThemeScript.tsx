import { THEME_STORAGE_KEY } from '@/lib/theme';

// Runs before React hydrates to reduce theme "flash".
// Placed in <head> so it executes before body is painted.
export function ThemeScript() {
  const script = `
  (function () {
    try {
      var key = ${JSON.stringify(THEME_STORAGE_KEY)};
      var stored = localStorage.getItem(key);
      // Fallback to 'system' if nothing stored
      var theme = stored || 'system';
      if (theme !== 'light' && theme !== 'dark' && theme !== 'system') theme = 'system';
      
      var resolved = theme;
      if (theme === 'system') {
        resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      // Apply to <html> immediately (before body exists)
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document.documentElement.classList.add(resolved);
      
      // Also set a class for additional CSS targeting
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    } catch (e) {
      // Fallback to light
      document.documentElement.dataset.theme = 'light';
      document.documentElement.style.colorScheme = 'light';
    }
  })();
  `;

  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

