import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Get the actual Tailwind CSS file
const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

// Test the design system API directly
async function testDesignSystem() {
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  console.log('=== Testing Tailwind v4 Design System API ===\n');
  
  const loadStylesheet = (id) => {
    if (id === 'tailwindcss') {
      return { content: realTailwindCSS };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  // Load design system with real Tailwind CSS
  const designSystem = await __unstable__loadDesignSystem('@import "tailwindcss";', { loadStylesheet });
  
  console.log('Design system loaded successfully\n');
  
  // Test various utilities
  const testCandidates = [
    ['w-4'],              // integer sizing (should work)
    ['w-2.5'],            // fractional sizing (failing)
    ['dark:border-gray-700'], // dark mode (failing)
    ['border-gray-300'],  // regular color (should work)
    ['rounded-full'],     // border radius (should work)
    ['px-2.5'],           // fractional padding (failing)
  ];
  
  for (const candidates of testCandidates) {
    console.log(`Testing: ${candidates.join(' ')}`);
    const cssResults = designSystem.candidatesToCss(candidates);
    console.log('Results:', cssResults);
    console.log('---');
  }
}

testDesignSystem().catch(console.error);

