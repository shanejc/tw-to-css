#!/usr/bin/env node

/**
 * CLI tool for tw-to-css build-time processing
 */

// Note: Node.js built-ins are imported dynamically to avoid bundling issues
import { generateClassMap, saveClassMap } from './build-time';

interface CLIOptions {
  input: string;
  output: string;
  classes?: string;
  context?: string;
  resolveVariables?: boolean;
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    input: '',
    output: '',
    resolveVariables: true
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--input':
      case '-i':
        options.input = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--classes':
      case '-c':
        options.classes = args[++i];
        break;
      case '--context':
        options.context = args[++i];
        break;
      case '--no-resolve-variables':
        options.resolveVariables = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!options.input && !arg.startsWith('-')) {
          options.input = arg;
        } else if (!options.output && !arg.startsWith('-')) {
          options.output = arg;
        }
        break;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
tw-to-css build-time processor

USAGE:
  tw-to-css-build [options] <input-css> <output-json>

ARGUMENTS:
  <input-css>     Path to CSS file with @import "tailwindcss" and custom styles
  <output-json>   Path to output JSON file with generated class map

OPTIONS:
  -i, --input <file>           Input CSS file path
  -o, --output <file>          Output JSON file path
  -c, --classes <file>         File containing list of classes to process (one per line)
  --context <json>             JSON string with context for conditional selectors
  --no-resolve-variables       Skip CSS variable resolution
  -h, --help                   Show this help message

EXAMPLES:
  # Basic usage
  tw-to-css-build src/index.css dist/tailwind-classes.json
  
  # With specific classes file
  tw-to-css-build -i src/index.css -o dist/classes.json -c classes.txt
  
  # With dark mode context
  tw-to-css-build src/index.css dist/classes.json --context '{"dark": true}'
  
  # Skip variable resolution
  tw-to-css-build src/index.css dist/classes.json --no-resolve-variables

CLASSES FILE FORMAT:
  Create a text file with one class name per line:
  
  w-4
  h-6
  bg-blue-500
  dark:text-white
  hover:bg-gray-100
  
INPUT CSS FORMAT:
  Your CSS file should contain:
  
  @import "tailwindcss";
  
  @layer components {
    .my-custom-class {
      /* custom styles */
    }
  }
  
  @theme {
    --my-color: #ff0000;
  }
`);
}

async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (!options.input || !options.output) {
    console.error('Error: Input and output paths are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }
  
  try {
    // Import Node.js built-ins dynamically
    const { readFileSync, existsSync } = await import('fs');
    const { resolve } = await import('path');
    
    // Resolve paths
    const inputPath = resolve(options.input);
    const outputPath = resolve(options.output);
    
    // Check if input file exists
    if (!existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }
    
    // Read input CSS
    console.log(`Reading CSS from: ${inputPath}`);
    const css = readFileSync(inputPath, 'utf8');
    
    // Read classes if specified
    let classes: string[] | undefined;
    if (options.classes) {
      const classesPath = resolve(options.classes);
      if (!existsSync(classesPath)) {
        console.error(`Error: Classes file not found: ${classesPath}`);
        process.exit(1);
      }
      
      console.log(`Reading classes from: ${classesPath}`);
      const classesContent = readFileSync(classesPath, 'utf8');
      classes = classesContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Filter empty lines and comments
      
      console.log(`Found ${classes.length} classes to process`);
    }
    
    // Parse context if specified
    let context;
    if (options.context) {
      try {
        context = JSON.parse(options.context);
        console.log('Using context:', context);
      } catch (error) {
        console.error('Error: Invalid JSON in context option');
        process.exit(1);
      }
    }
    
    // Generate class map
    console.log('Starting build-time processing...');
    const startTime = Date.now();
    
    const classMap = await generateClassMap({
      css,
      classes,
      context,
      resolveVariables: options.resolveVariables
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Save class map
    await saveClassMap(classMap, outputPath);
    
    // Show statistics
    const totalClasses = Object.keys(classMap).length;
    const resolvedClasses = Object.values(classMap).filter(v => v !== null).length;
    const nullClasses = totalClasses - resolvedClasses;
    
    console.log(`
✅ Build-time processing complete!

Statistics:
  Total classes:     ${totalClasses}
  Resolved classes:  ${resolvedClasses}
  Null classes:      ${nullClasses}
  Success rate:      ${Math.round((resolvedClasses / totalClasses) * 100)}%
  Processing time:   ${duration}s
  Output file:       ${outputPath}
`);
    
  } catch (error: any) {
    console.error('Error:', error?.message || error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
