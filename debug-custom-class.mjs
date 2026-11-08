import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

async function debugCustomClass() {
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  console.log('=== Debugging Custom Class wb-item-grid ===\n');
  
  const loadStylesheet = async (id, base) => {
    if (id === 'tailwindcss') {
      return { path: id, base, content: realTailwindCSS };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  // Test with just @import "tailwindcss"
  console.log('1. Testing wb-item-grid with basic CSS:');
  const basicCSS = '@import "tailwindcss";';
  const basicDesignSystem = await __unstable__loadDesignSystem(basicCSS, { loadStylesheet });
  const basicResult = basicDesignSystem.candidatesToCss(['wb-item-grid']);
  console.log('   candidatesToCss result:', basicResult[0]);
  
  // Test with custom CSS that includes wb-item-grid
  console.log('\n2. Testing wb-item-grid with custom CSS:');
  const customCSS = `
    @import "tailwindcss";
    
    @layer components {
      .wb-item-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 1px;
      }
    }
  `;
  
  const customDesignSystem = await __unstable__loadDesignSystem(customCSS, { loadStylesheet });
  const customResult = customDesignSystem.candidatesToCss(['wb-item-grid']);
  console.log('   candidatesToCss result:', customResult[0]);
  
  // Test a known Tailwind class for comparison
  console.log('\n3. Testing known Tailwind class border-2:');
  const tailwindResult = customDesignSystem.candidatesToCss(['border-2']);
  console.log('   candidatesToCss result:', tailwindResult[0]);
  
  // Test a truly non-existent class
  console.log('\n4. Testing non-existent class:');
  const nonExistentResult = customDesignSystem.candidatesToCss(['definitely-does-not-exist']);
  console.log('   candidatesToCss result:', nonExistentResult[0]);
}

debugCustomClass().catch(console.error);

