import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const result=await build({entryPoints:['web/main.js'],bundle:true,format:'iife',target:['es2020'],minify:true,write:false,legalComments:'inline'});
const css=await readFile('web/style.css','utf8');
const template=await readFile('web/template.html','utf8');
const js=result.outputFiles[0].text.replaceAll('</script','<\\/script');
// Function replacements preserve literal $&, $` and $' sequences inside bundled code.
await writeFile('overwatch-diorama.html',template.replace('/*__STYLE__*/',()=>css).replace('/*__APP__*/',()=>js));
console.log(`Built overwatch-diorama.html (${(Buffer.byteLength(template)+Buffer.byteLength(css)+Buffer.byteLength(js))/1024/1024} MiB), no runtime external files`);
