// Stub for fs module - provides basic preflight CSS
const getPreflightCSS = () => {
  // Fallback to a basic reset - this works in all environments
  return `*,::after,::before,::backdrop,::file-selector-button{box-sizing:border-box;margin:0;padding:0;border:0 solid}`;
};

export default {
  // Reading the preflight CSS is the only use of fs at the moment of writing.
  readFileSync: () => getPreflightCSS(),
};
