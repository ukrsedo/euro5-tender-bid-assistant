// The gateway reads the shared Pages frontend after authentication. No copied UI is built.
import {existsSync} from 'node:fs';
for(const path of ['access-worker.js','worker.js','auth/access.js','auth/session.js','auth/login.js'])if(!existsSync(path))throw Error('Missing shared source: '+path);
console.log('Unified protected access ready: no separate frontend assets.');
