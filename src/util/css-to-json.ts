import { CSSProperties } from "react";
import postcss from "postcss";
import postcssJs from "postcss-js";
import { resolveContextualCSS, CSSContext } from "./context-resolver";

export function cssToJson(css: string | null, context?: CSSContext): CSSProperties | null {
  // If css is null, it means the class was not found at all
  if (css === null) {
    return null;
  }
  
  // The CSS should already be processed by the tailwind plugin
  // which handles variable resolution, so we just need to convert to JSON
  const root = postcss.parse(css);
  const cssObject = postcssJs.objectify(root);
  
  // Always apply context resolution (missing context = empty context = exclude conditionals)
  return resolveContextualCSS(cssObject, context || {});
}
