import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Get the actual Tailwind CSS file
const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

console.log('=== Real Tailwind v4 CSS Structure ===');
console.log('Total length:', realTailwindCSS.length);
console.log('\nFull content:');
console.log(realTailwindCSS);

// Check if it contains @tailwind directives (v3 syntax)
console.log('\n=== Analysis ===');
console.log('Contains @tailwind utilities:', realTailwindCSS.includes('@tailwind utilities'));
console.log('Contains @layer utilities:', realTailwindCSS.includes('@layer utilities'));
console.log('Contains fractional spacing (2.5):', realTailwindCSS.includes('2.5'));
console.log('Contains dark mode:', realTailwindCSS.includes('dark:'));

// Look for utility definitions
const lines = realTailwindCSS.split('\n');
console.log('\nLast 20 lines:');
console.log(lines.slice(-20).join('\n'));

