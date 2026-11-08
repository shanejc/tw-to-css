# wb Project Integration Guide

## Current Issue
You're seeing:
- `borderRadius: calc(.25rem - 4px)` not resolved
- "Non-Tailwind classes found" errors for standard classes

## Root Cause
The wb project needs to configure tw-to-css with **dark mode context** for the runtime fallback.

## Quick Fix (Runtime Approach)

In your `satori_helper.ts`, update the tw-to-css initialization:

```javascript
// BEFORE (missing dark mode context)
const { twj } = tailwindToCSS({ 
  css: cssContent,
  options: { 
    resolveVariables: true
  }
});

// AFTER (with dark mode context)
const { twj } = tailwindToCSS({ 
  css: cssContent,
  options: { 
    resolveVariables: true,
    context: { dark: true } // ← ADD THIS
  }
});
```

This will fix:
- ✅ All "Non-Tailwind classes found" errors (dark mode classes will resolve)
- ✅ Mixed-unit calc expressions like `calc(.25rem - 4px)` → `0`

## Better Solution (Hybrid Approach)

For optimal performance, use the hybrid approach:

### 1. Create Build Script

Create `scripts/build-tailwind-map.mjs`:

```javascript
import { generateClassMap, saveClassMap } from 'tw-to-css/node';
import { readFileSync } from 'fs';

async function buildTailwindMap() {
  console.log('🔨 Building Tailwind class map...');
  
  // Read your CSS
  const css = readFileSync('src/index.css', 'utf8');
  
  // Generate comprehensive class map with dark mode support
  const classMap = await generateClassMap({
    css,
    context: { dark: true }, // Include dark mode variants
    resolveVariables: true
  });
  
  // Save for runtime use
  await saveClassMap(classMap, 'dist/tailwind-classes.json');
  
  console.log(`✅ Generated class map with ${Object.keys(classMap).length} classes`);
}

buildTailwindMap().catch(console.error);
```

### 2. Update package.json

```json
{
  "scripts": {
    "build:tailwind": "node scripts/build-tailwind-map.mjs",
    "build": "npm run build:tailwind && vite build",
    "dev": "npm run build:tailwind && vite dev"
  }
}
```

### 3. Update satori_helper.ts

```javascript
import { createRuntime, tailwindToCSS } from 'tw-to-css';
import cssContent from '../index.css?raw';

// Try to load pre-built class map
let buildTimeRuntime;
try {
  const classMap = await import('../dist/tailwind-classes.json');
  buildTimeRuntime = createRuntime({ classMap: classMap.default });
} catch {
  console.warn('No pre-built class map found, using runtime-only approach');
}

// Runtime fallback with dark mode context
const { twj: runtimeTwj } = tailwindToCSS({ 
  css: cssContent,
  options: { 
    resolveVariables: true,
    context: { dark: true }
  }
});

// Hybrid function: build-time first, runtime fallback
const tw = async (classStr: string) => {
  // Try build-time first (super fast)
  if (buildTimeRuntime) {
    const buildTimeResult = buildTimeRuntime.twj(classStr);
    if (buildTimeResult) {
      return buildTimeResult;
    }
  }
  
  // Fallback to runtime (handles any class)
  return await runtimeTwj(classStr);
};
```

## Expected Results

After implementing either solution:

✅ **No more "Non-Tailwind classes found" errors**
✅ **All calc expressions resolved**: `calc(.25rem - 4px)` → `0`
✅ **Dark mode classes work**: `dark:border-gray-700`, `dark:text-white`, etc.
✅ **Custom classes work**: `wb-item-grid`, etc.
✅ **Performance improvement** (with hybrid approach)

## Test the Fix

1. Update your tw-to-css package: `pnpm remove tw-to-css && pnpm add file:../tw-to-css/tw-to-css-1.2.0.tgz`
2. Add `context: { dark: true }` to your tw-to-css options
3. Clear cache and hard refresh
4. Check browser console - errors should be gone!

## Need Help?

If you're still seeing issues, check:
1. Is the new tw-to-css package version being used?
2. Is `context: { dark: true }` added to the options?
3. Are you importing CSS with `?raw` (not `?inline`)?

