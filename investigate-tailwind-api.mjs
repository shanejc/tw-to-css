import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Get the actual Tailwind CSS file
const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

async function investigateTailwindAPI() {
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  console.log('=== Investigating Tailwind v4 API ===\n');
  
  const loadStylesheet = (id) => {
    if (id === 'tailwindcss') {
      return { content: realTailwindCSS };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  // Test 1: Basic design system loading
  console.log('1. Loading design system...');
  const designSystem = await __unstable__loadDesignSystem('@import "tailwindcss";', { loadStylesheet });
  console.log('   Design system loaded successfully');
  
  // Test 2: Explore design system properties
  console.log('\n2. Design system properties:');
  const props = Object.getOwnPropertyNames(designSystem);
  console.log('   Available methods:', props);
  
  // Test 3: Test candidatesToCss with different options
  console.log('\n3. Testing candidatesToCss variations...');
  
  const testClass = 'text-base'; // Known to have line-height variables
  
  // Basic call
  const basic = designSystem.candidatesToCss([testClass]);
  console.log('   Basic candidatesToCss:');
  console.log('  ', JSON.stringify(basic[0]));
  
  // Test 4: Check if there are other methods for variable resolution
  console.log('\n4. Looking for variable resolution methods...');
  
  // Try to find methods that might handle variable resolution
  const methods = props.filter(prop => typeof designSystem[prop] === 'function');
  console.log('   Available functions:', methods);
  
  // Test 5: Check if design system has theme/variable access
  console.log('\n5. Checking for theme/variable access...');
  if (designSystem.theme) {
    console.log('   Has theme property');
  }
  if (designSystem.variables) {
    console.log('   Has variables property');
  }
  if (designSystem.resolve) {
    console.log('   Has resolve method');
  }
  
  // Test 6: Try different approaches to get resolved values
  console.log('\n6. Testing different approaches...');
  
  // Check what happens with a simple utility that should have resolved values
  const simpleUtility = designSystem.candidatesToCss(['w-4']);
  console.log('   w-4 result:', JSON.stringify(simpleUtility[0]));
  
  const colorUtility = designSystem.candidatesToCss(['text-red-500']);
  console.log('   text-red-500 result:', JSON.stringify(colorUtility[0]));
}

investigateTailwindAPI().catch(console.error);

