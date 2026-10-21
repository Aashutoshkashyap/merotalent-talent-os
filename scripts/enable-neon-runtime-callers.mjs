/** Mechanical backend-selector update; does not alter migration writers or experimental auth. */
import {execFileSync}from"node:child_process";
import{readFileSync,writeFileSync}from"node:fs";
const files=execFileSync("rg",["--files","src","app"],{encoding:"utf8"}).trim().split("\n").filter(f=>/\.tsx?$/.test(f)&&!/(?:\.test\.|\/test\/|\/tests\/)/.test(f));
let changed=0;
for(const file of files){
  if(["src/lib/server/backend-mode.ts","src/lib/backend-selection.ts"].includes(file))continue;
  const before=readFileSync(file,"utf8");let after=before;
  after=after.replace(/getBackendMode\(\)\s*(===|!==)\s*"neon-staging"/g,(_all,op)=>op==="==="?'getBackendMode() !== "legacy"':'getBackendMode() === "legacy"');
  let client=false;
  after=after.replace(/process\.env\.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE\s*(===|!==)\s*"neon-staging"/g,(_all,op)=>{client=true;return op==="==="?"isNeonClientRuntime()":"!isNeonClientRuntime()";});
  if(client&&!after.includes('from "@/lib/backend-selection"')){
    const directive=/^\s*(["'])use client\1;?/;
    const match=directive.exec(after),importLine='\nimport { isNeonClientRuntime } from "@/lib/backend-selection";\n';
    after=match?after.slice(0,match[0].length)+importLine+after.slice(match[0].length):importLine.trimStart()+after;
  }
  if(["src/lib/server/neon-maintenance.ts","src/lib/server/neon-guest-college-verification.ts","src/lib/server/storage.ts"].includes(file))after=after.replaceAll("requireNeonStaging","requireNeonBackend");
  if(file==="app/api/v1/neon-staging/jobs/saved/route.ts")after=after.replace('mode !== "neon-staging"','mode === "legacy"');
  if(after!==before){writeFileSync(file,after);changed++;}
}
console.log(JSON.stringify({changedFiles:changed}));
