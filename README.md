# 🔄 Tailwind to CSS (tw-to-css)

Transform Tailwind classes to pure CSS using **Tailwind CSS v4's native CSS-first approach**. No configuration files needed - just provide CSS and get compiled output.

## ✨ **True Tailwind v4**: CSS-First Architecture

- 🎯 **CSS-First Configuration**: Use `@import "tailwindcss"`, `@theme`, `@layer` directly
- 🚀 **Lightning CSS Powered**: Built on Tailwind v4's Rust-based CSS processor
- 🔥 **Modern CSS Support**: CSS variables, nested selectors, container queries
- ⚡ **Advanced State Variants**: `hover:`, `focus:`, `active:`, and more
- 📱 **Responsive Design**: Full support for `sm:`, `md:`, `lg:`, `xl:`, `2xl:` prefixes
- 🎨 **Complex Utilities**: `container`, `space-*`, `divide-*`, and advanced selectors

## Key Advantages:

- ✅ **Zero Configuration**: Works with standard Tailwind v4 CSS
- ✅ **Universal Compatibility**: Client-side, Server-side, and Browser environments
- ✅ **Complete Feature Parity**: All v4 utilities supported
- ✅ **Performance Optimized**: Leverages Lightning CSS for speed
- ✅ **Developer Friendly**: TypeScript support with full type safety
- ✅ **CSS Variable Resolution**: Convert variables to concrete values for legacy support

## Installation

#### NPM module

```sh npm
npm install tw-to-css -E
```

```sh yarn
yarn add tw-to-css -E
```

#### CDN

```html
<script src="https://unpkg.com/tw-to-css@1.1.0/dist/cdn.min.js"></script>
```

## Usage

```typescript
import { twi, twj } from "tw-to-css";

// ✨ Zero configuration - uses Tailwind v4 defaults
const basicCSS = await twi('bg-white mx-auto');
// Output: margin-left:auto;margin-right:auto;background-color:var(--color-white);

// Advanced state variants
const hoverCSS = await twi('hover:bg-red-600 focus:ring-2');
// Output: .hover\:bg-red-600 {&:hover {@media (hover: hover) {background-color: var(--color-red-600);}}}...

// Responsive design
const responsiveCSS = await twi('md:text-xl lg:text-2xl');
// Output: .md\:text-xl {@media (width >= 48rem) {font-size: var(--text-xl);}}...

// Complex utilities
const complexCSS = await twi('container space-x-4');
// Output: Full responsive container + space utilities with :where() selectors

// Convert to JSON for React/frameworks
const styleJSON = await twj('bg-white mx-auto');
// Output: {marginLeft: 'auto', marginRight: 'auto', backgroundColor: 'var(--color-white)'}
```

### 🎨 CSS-First Configuration (True v4 Style)

```typescript
import { tailwindToCSS } from "tw-to-css";

// Define your design system in CSS
const myCSS = `
@import "tailwindcss";

@theme {
  --color-brand-primary: oklch(0.7 0.15 200);
  --color-brand-secondary: oklch(0.8 0.1 300);
  --font-brand: "Inter", sans-serif;
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium;
  }
  .btn-primary {
    @apply bg-brand-primary text-white hover:bg-brand-secondary;
  }
}
`;

// Create configured functions
const { twi, twj } = tailwindToCSS({ css: myCSS });

// Use your custom design system
const customCSS = await twi('btn btn-primary');
// Output includes your custom components and theme
```

### The `twi` and `twj` functions accept multiple types of inputs (all async in v4).

- Template Literal

```typescript
await twi`bg-blue-700 ${false && "rounded"}`;
```

- Objects

```typescript
await twi({ "bg-blue-700": true, rounded: false, underline: isTrue() });
```

- Arrays

```typescript
await twi([["bg-blue-700"], ["text-white", "rounded"], [["underline"]]]);
```

- String

```typescript
await twi("bg-blue-700 text-white");
```

### `twi` and `twj` functions take an additional options object that allows you to configure the output.

#### Options:

| Option | Type    | Default | Result                                                        |
| ------ | ------- | ------- | ------------------------------------------------------------- |
| minify | boolean | true    | Compresses the CSS code                                       |
| merge  | boolean | true    | Combines all generated CSS classes into a single style block. |
| resolveVariables | boolean | false | **NEW**: Converts CSS variables to concrete values |

#### Example:

```typescript
await twi("bg-white mx-auto", { minify: false, merge: false });
/*
Output (v4 with CSS variables):
.mx-auto {
    margin-left: auto;
    margin-right: auto
}
.bg-white {
    background-color: var(--color-white)
}
*/
```

### 🔧 Legacy v3 Config Support (Deprecated)

```typescript
import { tailwindToCSS } from "tw-to-css";

// ⚠️ Deprecated: v3-style config (still supported)
const { twi, twj } = tailwindToCSS({
  config: {
    theme: {
      extend: {
        colors: {
          "custom-color": "#ff0000",
        },
      },
    },
  },
});

// ✅ Recommended: v4 CSS-first approach
const { twi: newTwi, twj: newTwj } = tailwindToCSS({
  css: `
    @import "tailwindcss";
    @theme {
      --color-custom: #ff0000;
    }
  `
});
```

### Example of usage with React (v4 async):

```tsx
import * as React from "react";
import { twj } from "tw-to-css";

export default async function EmailTemplate() {
  const bodyStyles = await twj("font-sans text-md bg-white py-4");
  const titleStyles = await twj("text-black text-center p-0 my-2 mx-0");
  const subtitleStyles = await twj("text-gray-400 text-center md:text-lg");

  return (
    <html>
      <body style={bodyStyles}>
        <h1 style={titleStyles}>Tailwind to CSS v4!</h1>
        <p style={subtitleStyles}>True CSS-first architecture</p>
      </body>
    </html>
  );
}

/*
Output (v4 with CSS variables):
<html>
  <body
    style="{
      backgroundColor: 'var(--color-white)',
      fontFamily: 'var(--font-sans)',
      paddingTop: 'calc(var(--spacing) * 4)',
      paddingBottom: 'calc(var(--spacing) * 4)'
    }"
  >
    <h1
      style="{
        margin: 'calc(var(--spacing) * 2) 0px',
        padding: '0px',
        textAlign: 'center',
        color: 'var(--color-black)'
      }"
    >
      Tailwind to CSS v4!
    </h1>
    <p style="{
      color: 'var(--color-gray-400)',
      textAlign: 'center'
      // Responsive utilities generate complex CSS
    }">
      True CSS-first architecture
    </p>
  </body>
</html>
*/
```

## 🚀 Tailwind CSS v4 Features

### Modern CSS Support
- **CSS Variables**: All theme values use CSS custom properties (`var(--color-red-500)`)
- **Nested Selectors**: Complex selectors like `:where(& > :not(:last-child))`
- **Advanced Media Queries**: Modern syntax like `@media (width >= 48rem)`
- **CSS Properties**: `@property` declarations for enhanced browser support

### Complete Utility Coverage
```typescript
// ✅ All these now work perfectly:
await twi('hover:bg-red-600 focus:ring-2');           // State variants
await twi('md:text-xl lg:text-2xl xl:text-3xl');     // Responsive design
await twi('container mx-auto');                       // Layout utilities
await twi('space-x-4 divide-y divide-gray-200');     // Complex utilities
await twi('before:content-[""] after:content-[""]'); // Pseudo-elements
```

### Breaking Changes from v3
- **Async Functions**: All `twi` and `twj` calls must be awaited
- **CSS Variables**: Output uses CSS custom properties instead of hardcoded values
- **Complex CSS**: Some utilities now generate complete CSS rules instead of simple declarations
- **CSS-First Config**: `tailwindToCSS({ css })` replaces `tailwindToCSS({ config })`

### Browser Compatibility
- **Universal Support**: Works in Node.js, browsers, and edge environments
- **Lightning CSS Powered**: Uses Tailwind v4's Rust-based CSS processor
- **CSS Variable Support**: Requires modern browsers that support CSS custom properties
- **True v4 Architecture**: No config files, pure CSS-first approach

## 🔧 CSS Variable Resolution

### Default Behavior (CSS Variables)
```typescript
await twi('bg-red-500 text-xl p-4');
// Output: background-color:var(--color-red-500);font-size:var(--text-xl);padding:calc(var(--spacing) * 4);
```

### Concrete Values (resolveVariables: true)
```typescript
await twi('bg-red-500 text-xl p-4', { resolveVariables: true });
// Output: background-color:oklch(63.7% 0.237 25.331);font-size:1.25rem;padding:4rem;
```

### When to Use Each Approach

#### **CSS Variables (Default)** ✅ Recommended
- **Smaller CSS output** - Variables are reused
- **Runtime theming** - Change colors dynamically
- **Modern CSS** - Browser-optimized
- **Future-proof** - Tailwind v4's native approach

#### **Concrete Values** 🎯 Specific Use Cases
- **Email templates** - Limited CSS variable support
- **Legacy browsers** - IE11, older mobile browsers  
- **Static CSS** - No runtime dependencies needed
- **Debugging** - Easier to inspect concrete values

### Examples

```typescript
// Colors: CSS variables vs concrete
await twi('bg-red-500');
// → background-color:var(--color-red-500);

await twi('bg-red-500', { resolveVariables: true });
// → background-color:oklch(63.7% 0.237 25.331);

// Spacing: calc() expressions vs concrete
await twi('p-4');
// → padding:calc(var(--spacing) * 4);

await twi('p-4', { resolveVariables: true });
// → padding:4rem;

// JSON output with concrete values
await twj('bg-red-500 text-xl', { resolveVariables: true });
// → { backgroundColor: 'oklch(63.7% 0.237 25.331)', fontSize: '1.25rem' }
```
