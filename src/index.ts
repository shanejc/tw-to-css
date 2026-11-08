import types from "..";
import { processTailwindCSS, formatCSS } from "./util";
import { cssToJson } from "./util/css-to-json";

const getCSS: typeof types.getCSS = async (content, inputCSS) => {
  return await processTailwindCSS({
    inputCSS,
    content,
  });
};

const tailwindToCSS: typeof types.tailwindToCSS = (params = {}) => {
  // Support both new CSS-first and legacy config-based approaches
  const inputCSS = 'css' in params ? params.css : undefined;
  const options = params.options;
  
  // Legacy support: warn about deprecated config usage
  if ('config' in params && params.config) {
    console.warn('tw-to-css: Using `config` is deprecated in v4. Use `css` instead for CSS-first configuration.');
  }
  
  return {
    twi: tailwindInlineCSS(inputCSS, options),
    twj: tailwindInlineJson(inputCSS, options),
  };
};

const classListFormatter: typeof types.classListFormatter = (...params) => {
  let classList = "";

  if (typeof params[0] === "string") {
    classList = params[0];
  } else if (Array.isArray(params[0])) {
    classList = (params as any[])
      .flat(Infinity)
      .map((styles) => classListFormatter(styles))
      .join(" ");
  } else if (typeof params[0] === "object") {
    classList = Object.entries(params[0])
      .filter((entry) => !!entry[1])
      .map((entry) => entry[0])
      .join(" ");
  }

  classList = classList.replace(/\s+/g, " ");

  return classList;
};

const tailwindInlineCSS: typeof types.tailwindInlineCSS =
  (inputCSS, mainOptions) =>
  async (...params: any) => {
    const content = classListFormatter(params);

    const { 1: options } = params || {};

    const defaultOptions = { merge: true, minify: true, ignoreMediaQueries: true };
    const twiOptions = { ...defaultOptions, ...mainOptions, ...options };

    let rawCSS = await getCSS(content, inputCSS);
    
    // If class was not found, return null
    if (rawCSS === null) {
      return null;
    }
    
    // Variable resolution is now handled in the plugin itself
    
    // For Tailwind v4, check if we have complex CSS
    // Complex CSS includes: nested selectors (&), at-rules (@), or complex selectors (:where, :not, etc.)
    const hasComplexCSS = rawCSS.includes('&') || rawCSS.includes('@') || rawCSS.includes(':where') || rawCSS.includes(':not');
    
    if (hasComplexCSS) {
      // This is complex v4 CSS - return it as-is with minimal processing
      let processedCSS = rawCSS;
      
      // Only apply safe transformations that don't break nested CSS
      if (twiOptions?.minify) {
        processedCSS = processedCSS
          .replace(/\s+/g, ' ')           // Collapse whitespace
          .replace(/;\s+/g, ';')          // Remove spaces after semicolons
          .replace(/{\s+/g, '{')          // Remove spaces after opening braces
          .replace(/\s+}/g, '}')          // Remove spaces before closing braces
          .trim();
      }
      
      return processedCSS;
    }
    
    // For simple CSS, use the legacy formatCSS pipeline
    let css = formatCSS(rawCSS);

    if (twiOptions?.ignoreMediaQueries) {
      css.removeMediaQueries();
    } else {
      css.removeUndefined();
      css.combineMediaQueries();
    }

    css.fixRGB();

    if (twiOptions?.merge) css.merge();
    if (twiOptions?.minify) css.minify();

    return css.get();
  };

const tailwindInlineJson: typeof types.tailwindInlineJson =
  (inputCSS, mainOptions) =>
  async (...params: any) => {
    // Extract options from params - options is typically the second parameter
    const options = params[1] || mainOptions || {};
    const context = options.context;
    
    const css = await tailwindInlineCSS(inputCSS, mainOptions)(...params);
    return cssToJson(css, context);
  };

const twi: typeof types.twi = tailwindInlineCSS();
const twj: typeof types.twj = tailwindInlineJson();

const twToCSS = tailwindToCSS;

export { twi, twj, tailwindToCSS, twToCSS };

// Runtime exports for build-time processed maps (browser-safe)
export { 
  createRuntime,
  type ClassMap as RuntimeClassMap,
  type RuntimeOptions,
  type TailwindRuntime
} from './runtime';
