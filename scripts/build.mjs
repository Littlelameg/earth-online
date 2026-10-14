import {build} from 'esbuild';
import {copyFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('dist/vendor',{recursive:true});
await build({entryPoints:['src/cloudbase-entry.js'],bundle:true,platform:'browser',format:'iife',target:['es2020'],minify:true,legalComments:'eof',outfile:'dist/vendor/cloudbase.js'});
copyFileSync('dist/world-core.js','cloudfunctions/earth-world/world-core.cjs');
const dependency=JSON.parse(readFileSync('node_modules/@cloudbase/js-sdk/package.json','utf8'));
writeFileSync('dist/vendor/NOTICE.txt',`CloudBase JavaScript SDK ${dependency.version}\nApache-2.0\nhttps://github.com/TencentCloudBase/cloudbase-js-sdk\nBundled dependencies retain license notices in cloudbase.js.\n`);
