import { fileURLToPath } from 'url';

// Prefer `@modeler/grammar/grammar` (declared in package exports) over this constant.
export const grammarFile = fileURLToPath(new URL('../src/TTR.g4', import.meta.url));
export const grammarDir = fileURLToPath(new URL('../src', import.meta.url));