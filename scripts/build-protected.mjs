import {mkdir,rm,copyFile,writeFile} from 'node:fs/promises';
await rm('protected-public',{recursive:true,force:true});await mkdir('protected-public');
for(const file of ['index.html','styles.css','euro5-logo.png','app.js','memory.js','price-risk.js','buyer-card.js','buyer-competition.js'])await copyFile(file,'protected-public/'+file);
await writeFile('protected-public/config.js','window.EURO5_CONFIG = {apiUrl: window.location.origin};\n');
console.log('Protected assets built; server code, profiles and secrets excluded.');
