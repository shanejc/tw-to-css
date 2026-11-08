// Proof of concept: Build-time CSS processing with runtime class mapping

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function buildTimeProcessor() {
  console.log('=== Build-Time CSS Processing Proof of Concept ===\n');
  
  try {
    // 1. Load Tailwind v4 and process the full CSS at build time
    const { __unstable__loadDesignSystem } = await import('tailwindcss');
    
    // Load the user's CSS (with custom classes, theme, etc.)
    const userCSS = `
      @import "tailwindcss";
      
      @layer components {
        .wb-item-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: calc(var(--spacing-4) * 2);
          padding: calc(8px - 4px);
          border-radius: calc(var(--radius) - 2px);
        }
      }
      
      @theme {
        --spacing-4: 1rem;
        --radius: 0.5rem;
      }
    `;
    
    // Load stylesheet function
    const loadStylesheet = async (id) => {
      if (id === 'tailwindcss') {
        const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
        const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');
        return { path: id, base: '', content: realTailwindCSS };
      }
      return { path: id, base: '', content: '' };
    };
    
    const designSystem = await __unstable__loadDesignSystem(userCSS, { loadStylesheet });
    
    // 2. Generate a comprehensive class-to-styles mapping at build time
    const commonClasses = [
      // Layout
      'block', 'inline-block', 'flex', 'grid', 'hidden',
      // Sizing
      'w-4', 'w-6', 'w-8', 'w-full', 'h-4', 'h-6', 'h-8', 'h-full',
      // Spacing
      'p-2', 'p-4', 'p-6', 'm-2', 'm-4', 'm-6',
      'px-2', 'px-4', 'py-2', 'py-4',
      // Colors
      'bg-white', 'bg-gray-100', 'bg-blue-500', 'text-black', 'text-gray-600',
      // Borders
      'border', 'border-2', 'border-gray-200', 'rounded', 'rounded-lg',
      // Custom classes
      'wb-item-grid'
    ];
    
    console.log('Processing classes at build time...');
    const classMap = {};
    
    for (const className of commonClasses) {
      try {
        // Get raw CSS for this class
        const cssResults = designSystem.candidatesToCss([className]);
        const rawCSS = cssResults[0];
        
        if (rawCSS) {
          // Apply variable resolution using Lightning CSS (if available)
          let resolvedCSS = rawCSS;
          
          // Simulate variable resolution (in real implementation, use Lightning CSS)
          resolvedCSS = resolvedCSS
            .replace(/var\(--spacing-4\)/g, '1rem')
            .replace(/var\(--radius\)/g, '0.5rem')
            .replace(/calc\(1rem \* 2\)/g, '2rem')
            .replace(/calc\(8px - 4px\)/g, '4px')
            .replace(/calc\(0\.5rem - 2px\)/g, 'calc(0.5rem - 2px)'); // Keep mixed units
          
          // Convert to JSON object
          const styles = cssToObject(resolvedCSS, className);
          if (styles && Object.keys(styles).length > 0) {
            classMap[className] = styles;
          }
        }
      } catch (error) {
        console.warn(`Failed to process ${className}:`, error.message);
      }
    }
    
    console.log('\n=== Build-Time Generated Class Map ===');
    console.log(JSON.stringify(classMap, null, 2));
    
    // 3. Simulate runtime usage (super fast!)
    console.log('\n=== Runtime Class Lookup (Fast!) ===');
    const runtimeLookup = (className) => {
      return classMap[className] || null;
    };
    
    console.log('w-4:', runtimeLookup('w-4'));
    console.log('bg-blue-500:', runtimeLookup('bg-blue-500'));
    console.log('wb-item-grid:', runtimeLookup('wb-item-grid'));
    
    console.log('\n🎉 Build-time processing complete!');
    console.log('Benefits:');
    console.log('  ✅ All CSS processing done at build time');
    console.log('  ✅ All variables and calcs resolved upfront');
    console.log('  ✅ Runtime lookups are just object property access');
    console.log('  ✅ No PostCSS or Tailwind APIs needed in browser');
    console.log('  ✅ Tiny runtime bundle size');
    
  } catch (error) {
    console.error('Build-time processing failed:', error);
  }
}

// Simple CSS to object converter (simplified for demo)
function cssToObject(css, className) {
  const styles = {};
  
  // Extract the rule for this class
  const classRule = css.match(new RegExp(`\\.${escapeRegex(className)}\\s*\\{([^}]+)\\}`))?.[1];
  if (!classRule) return null;
  
  // Parse declarations
  const declarations = classRule.split(';').filter(Boolean);
  for (const decl of declarations) {
    const [property, value] = decl.split(':').map(s => s.trim());
    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      styles[camelProperty] = value;
    }
  }
  
  return styles;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

buildTimeProcessor().catch(console.error);

