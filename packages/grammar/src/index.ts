import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const grammarFile = path.join(__dirname, '../src/TTR.g4');
export const grammarDir = path.join(__dirname, '../src');