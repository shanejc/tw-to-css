import { generateClassMap, createRuntime } from './dist/node.mjs';

async function testBuildTimeCalc() {
  console.log('=== Testing Build-Time Calc Resolution ===\n');
  
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
  
  console.log('🔍 Testing build-time processing with calc expressions...');
  
  try {
    // Generate class map (this should resolve calc expressions)
    const classMap = await generateClassMap({
      css: testCSS,
      classes: ['test-mixed-calc', 'wb-item-grid'], // Specific classes
      context: { dark: true },
      resolveVariables: true
    });
    
    console.log(`\n📊 Generated class map with ${Object.keys(classMap).length} classes`);
    
    // Check if calc expressions were resolved in the build-time map
    const runtime = createRuntime({ classMap });
    
    const testClasses = ['test-mixed-calc', 'wb-item-grid'];
    
    for (const className of testClasses) {
      const result = runtime.twj(className);
      if (result) {
        const resultStr = JSON.stringify(result);
        console.log(`\n${className}:`);
        console.log(`  ${resultStr}`);
        
        // Check for unresolved calc expressions
        if (resultStr.includes('calc(.25rem - 4px)')) {
          console.log(`  ❌ Still contains calc(.25rem - 4px) - NOT RESOLVED`);
        } else if (resultStr.includes('calc(')) {
          console.log(`  ⚠️  Contains other calc expressions`);
        } else {
          console.log(`  ✅ All calc expressions resolved`);
        }
      } else {
        console.log(`\n${className}: null`);
      }
    }
    
    // Check the raw class map data
    console.log('\n🔍 Raw class map data:');
    for (const className of testClasses) {
      if (classMap[className]) {
        console.log(`${className}: ${JSON.stringify(classMap[className])}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Build-time processing failed:', error.message);
  }
}

testBuildTimeCalc().catch(console.error);

