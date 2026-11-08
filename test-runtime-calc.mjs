import { tailwindToCSS } from './dist/index.mjs';

async function testRuntimeCalc() {
  console.log('=== Testing Runtime Calc Resolution ===\n');
  
  // Test CSS with mixed-unit calc expressions (like wb has)
  const testCSS = `
    @import "tailwindcss";
    
    @layer components {
      .test-mixed-calc {
        border-radius: calc(.25rem - 4px);
        margin: calc(1rem + 8px);
        padding: calc(16px - 0.5rem);
      }
      
      .wb-item-grid {
        border-radius: calc(.25rem - 4px);
        gap: calc(var(--spacing-4) * 2);
      }
    }
    
    @theme {
      --spacing-4: 1rem;
    }
  `;
  
  console.log('🔍 Testing runtime processing with calc expressions...');
  
  try {
    // Test runtime processing (what wb is currently using)
    const { twj } = tailwindToCSS({ 
      css: testCSS,
      options: { 
        resolveVariables: true,
        context: { dark: true }
      }
    });
    
    const testClasses = ['test-mixed-calc', 'wb-item-grid'];
    
    for (const className of testClasses) {
      const result = await twj(className);
      if (result) {
        const resultStr = JSON.stringify(result);
        console.log(`\n${className}:`);
        console.log(`  ${resultStr}`);
        
        // Check for unresolved calc expressions
        if (resultStr.includes('calc(.25rem - 4px)')) {
          console.log(`  ❌ Still contains calc(.25rem - 4px) - RUNTIME CALC RESOLUTION FAILED`);
        } else if (resultStr.includes('calc(')) {
          console.log(`  ⚠️  Contains other calc expressions`);
        } else {
          console.log(`  ✅ All calc expressions resolved by runtime`);
        }
      } else {
        console.log(`\n${className}: null`);
      }
    }
    
  } catch (error) {
    console.error('💥 Runtime processing failed:', error.message);
  }
}

testRuntimeCalc().catch(console.error);

