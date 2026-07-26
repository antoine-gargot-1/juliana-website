import 'react';

// The design system drives per-element animation delays through the `--rd`
// custom property set inline (e.g. style={{ '--rd': '120ms' }}). React's
// CSSProperties does not allow arbitrary custom properties by default.
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
