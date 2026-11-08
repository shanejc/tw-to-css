// Import from the built version
import { readFileSync } from 'fs';
const TAILWIND_V4_CSS = readFileSync('./src/util/tailwind-v4-css.ts', 'utf8')
  .split('export const TAILWIND_V4_CSS = `')[1]
  .split('`;')[0];

async function compareCSSVersions() {
  console.log('Comparing bundled CSS vs CDN CSS...\n');
  
  // Get CDN version
  const cdnResponse = await fetch('https://cdn.jsdelivr.net/npm/tailwindcss@4/index.css');
  const cdnCSS = await cdnResponse.text();
  
  console.log('Bundled CSS length:', TAILWIND_V4_CSS.length);
  console.log('CDN CSS length:', cdnCSS.length);
  
  console.log('\nBundled CSS (first 500 chars):');
  console.log(TAILWIND_V4_CSS.substring(0, 500));
  
  console.log('\nCDN CSS (first 500 chars):');
  console.log(cdnCSS.substring(0, 500));
  
  // Check for key differences
  console.log('\n=== Key Differences ===');
  console.log('Bundled has @tailwind utilities:', TAILWIND_V4_CSS.includes('@tailwind utilities'));
  console.log('CDN has @tailwind utilities:', cdnCSS.includes('@tailwind utilities'));
  
  console.log('Bundled has fractional spacing:', TAILWIND_V4_CSS.includes('2.5'));
  console.log('CDN has fractional spacing:', cdnCSS.includes('2.5'));
  
  console.log('Bundled has --spacing var:', TAILWIND_V4_CSS.includes('--spacing'));
  console.log('CDN has --spacing var:', cdnCSS.includes('--spacing'));
  
  // Check end of files
  console.log('\nBundled CSS (last 200 chars):');
  console.log(TAILWIND_V4_CSS.slice(-200));
  
  console.log('\nCDN CSS (last 200 chars):');
  console.log(cdnCSS.slice(-200));
  
  // Are they identical?
  console.log('\nAre they identical?', TAILWIND_V4_CSS === cdnCSS);
}

compareCSSVersions().catch(console.error);
