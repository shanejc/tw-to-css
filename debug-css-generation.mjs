import { tailwindToCSS } from './dist/index.mjs';

const { twi } = tailwindToCSS({ 
  css: '@import "tailwindcss";', 
  options: { resolveVariables: true } 
});

async function debugCSSGeneration() {
  console.log('Debugging CSS generation for failing classes...\n');
  
  // Test what raw CSS is generated
  const result = await twi('dark:border-gray-700');
  console.log('Raw CSS for dark:border-gray-700:');
  console.log(`"${result}"`);
  console.log('Length:', result.length);
  
  console.log('\n---\n');
  
  const result2 = await twi('w-2.5');
  console.log('Raw CSS for w-2.5:');
  console.log(`"${result2}"`);
  console.log('Length:', result2.length);
  
  console.log('\n---\n');
  
  // Test a class we know works
  const result3 = await twi('rounded-full');
  console.log('Raw CSS for rounded-full (should work):');
  console.log(`"${result3}"`);
  console.log('Length:', result3.length);
}

debugCSSGeneration().catch(console.error);

