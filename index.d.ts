import { CSSProperties } from "react";

type Content = string | Record<string, boolean> | TemplateStringsArray | Content[];

type CSSContext = {
  /** 
   * Variant context: map of variant names to boolean values
   * - true: resolve this variant (include its styles)
   * - false/undefined: skip this variant (exclude its styles)
   * 
   * Examples:
   * - 'dark': true           // Resolve dark: variants
   * - 'hover': false         // Skip hover: variants
   * - 'lg': true             // Resolve lg: breakpoint
   * - 'focus': false         // Skip focus: variants
   * - 'group-hover': true    // Resolve group-hover: variants
   * - 'data-[state=open]': true  // Custom arbitrary variants
   */
  [variantName: string]: boolean;
};

type Options = { 
  merge?: boolean; 
  minify?: boolean; 
  ignoreMediaQueries?: boolean;
  resolveVariables?: boolean;
  /** Context for resolving conditional selectors (dark mode, hover, etc.) */
  context?: CSSContext;
};

// V4 CSS-first configuration
type TailwindCSSConfig = {
  /** 
   * Raw CSS input containing @import "tailwindcss", @theme, @layer, etc.
   * If not provided, uses Tailwind v4 default CSS.
   */
  css?: string;
  /** Default options for all twi/twj calls */
  options?: Options;
};

// Legacy v3-style config support (deprecated)
type LegacyConfig = {
  /** @deprecated Use `css` instead. V3-style config for backwards compatibility. */
  config?: any;
  options?: Options;
};

export function getCSS(content: string, inputCSS?: string): Promise<string | null>;

export function tailwindToCSS(params?: TailwindCSSConfig | LegacyConfig): {
  twi: typeof twi;
  twj: typeof twj;
};

export function classListFormatter(content: Content, options?: Options): string;
export function classListFormatter(...content: Content[]): string;

export function twi(content: Content, options?: Options): Promise<string | null>;
export function twi(...content: Content[]): Promise<string | null>;

export function twj(content: Content, options?: Options): Promise<CSSProperties | null>;
export function twj(...content: Content[]): Promise<CSSProperties | null>;

export function tailwindInlineCSS(inputCSS?: string, options?: Options): typeof twi;

export function tailwindInlineJson(
  inputCSS?: string,
  options?: Omit<Options, "minify" | "ignoreMediaQueries">
): typeof twj;

// Runtime types and functions for build-time processed maps
export interface RuntimeClassMap {
  [className: string]: CSSProperties | null;
}

export interface RuntimeOptions {
  classMap: RuntimeClassMap;
}

export interface TailwindRuntime {
  twj: (className: string) => CSSProperties | null;
  twi: (className: string) => string;
  twjMultiple: (classNames: string[] | string) => CSSProperties;
  twiMultiple: (classNames: string[] | string) => string;
  hasClass: (className: string) => boolean;
  getAvailableClasses: () => string[];
  getStats: () => {
    totalClasses: number;
    resolvedClasses: number;
    nullClasses: number;
    resolvedPercentage: number;
  };
}

export declare function createRuntime(options: RuntimeOptions): TailwindRuntime;

// Legacy exports
export const twToCSS: typeof tailwindToCSS;
