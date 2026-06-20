import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// batch/src/ の 2 階層上がリポジトリルート
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
