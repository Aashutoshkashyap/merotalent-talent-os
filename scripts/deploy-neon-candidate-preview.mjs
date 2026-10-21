/** Isolated Vercel preview for production-target acceptance; never promotes traffic. */
import {execFileSync,spawn} from 'node:child_process';
import {mkdtemp,cp,mkdir,writeFile,lstat} from 'node:fs/promises';
import {tmpdir,homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import dotenv from 'dotenv';
import {productionCandidateUrl} from './production-candidate-boundary.mjs';

const deploy=process.argv.includes('--deploy-preview-only');
const directory=join(homedir(),'Library','Application Support','MeroTalent','migration-artifacts');
const secret=(service)=>execFileSync('security',['find-generic-password','-a','merotalent','-s',service,'-w'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try{
  const privateDirectory=await lstat(directory);
  if(!privateDirectory.isDirectory()||privateDirectory.isSymbolicLink()||(privateDirectory.mode&0o077))throw Error('PRIVATE_DIRECTORY_REQUIRED');
  const migration=dotenv.config({path:'.migration.env',quiet:true}).parsed??{};
  const local=dotenv.config({path:'.env',quiet:true}).parsed??{};
  const database=productionCandidateUrl(migration.NEON_PRODUCTION_DATABASE_URL);
  const storage=JSON.parse(secret('MeroTalent Neon Production Object Storage'));
  if(storage.branchId!=='br-falling-breeze-azr6q64l'||storage.endpoint!=='https://br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech')throw Error('STORAGE_TARGET_MISMATCH');
  const publicKey=local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!publicKey||local.NEXT_PUBLIC_SUPABASE_URL!=='https://dtirpilgzlsfryucanlg.supabase.co')throw Error('SOURCE_PROOF_CONFIGURATION_REQUIRED');
  if(!deploy){console.log(JSON.stringify({mode:'DRY_RUN',target:'preview',canonicalTrafficSwitched:false,livePayments:false,sourceAdminCredentialIncluded:false}));process.exit(0);}
  let cookieSecret;
  try{cookieSecret=secret('MeroTalent Neon Candidate OAuth Cookie');}catch{
    cookieSecret=randomBytes(48).toString('base64url');
    execFileSync('security',['add-generic-password','-a','merotalent','-s','MeroTalent Neon Candidate OAuth Cookie','-w',cookieSecret],{stdio:['ignore','pipe','pipe']});
  }
  const env={MEROTALENT_BACKEND_MODE:'neon-production',NEXT_PUBLIC_MEROTALENT_BACKEND_MODE:'neon-production',
    NEON_PRODUCTION_BRANCH_ID:storage.branchId,NEON_PRODUCTION_DATABASE_URL:database.href??database,
    NEON_AUTH_BASE_URL:'https://ep-polished-flower-azsezy8a.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth',
    NEON_GOOGLE_OAUTH_ENABLED:'true',NEON_AUTH_COOKIE_SECRET:cookieSecret,
    NEON_PRODUCTION_PAYMENTS_ENABLED:'false',NEON_PRODUCTION_EMAIL_DELIVERY_ENABLED:'false',
    AWS_ENDPOINT_URL_S3:storage.endpoint,AWS_ACCESS_KEY_ID:storage.accessKeyId,AWS_SECRET_ACCESS_KEY:storage.secretAccessKey,AWS_REGION:storage.region,
    NEXT_PUBLIC_SUPABASE_URL:local.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:publicKey,
    SUPABASE_URL:local.NEXT_PUBLIC_SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:publicKey,NEON_STAGING_IDENTITY_LINK_MODE:'verified-source'};
  if(Object.values(env).some(value=>typeof value!=='string'||!value))throw Error('INCOMPLETE_PREVIEW_CONFIGURATION');
  const root=await mkdtemp(join(tmpdir(),'merotalent-neon-candidate-preview-'));
  const files=execFileSync('git',['ls-files','-co','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  const manifest=[];
  for(const file of new Set(files)){
    if(file.split('/').some(part=>part.startsWith('.env')||part==='.migration.env'||part==='.git'||part==='node_modules'||part==='.next')||file.endsWith('.log'))continue;
    const stat=await lstat(file).catch(()=>null);if(!stat?.isFile()||stat.isSymbolicLink())continue;
    const destination=join(root,file);await mkdir(dirname(destination),{recursive:true});await cp(file,destination);
    manifest.push(file);
  }
  await mkdir(join(root,'.vercel'),{recursive:true});await cp('.vercel/project.json',join(root,'.vercel','project.json'));
  const manifestHash=createHash('sha256').update(manifest.sort().join('\n')).digest('hex');
  const args=['--yes','vercel@54.14.5','deploy',root,'--target=preview','--yes','--format=json','--no-wait'];
  for(const [key,value] of Object.entries(env)){args.push('--env',`${key}=${value}`,'--build-env',`${key}=${value}`);}
  const result=await new Promise((resolve,reject)=>{const child=spawn('npx',args,{stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);child.on('close',code=>resolve({code,out,err}));});
  const stamp=new Date().toISOString().replace(/[^0-9]/g,'');
  await writeFile(join(directory,`candidate-preview-cli-${stamp}.json`),JSON.stringify(result),{mode:0o600,flag:'wx'});
  if(result.code!==0)throw Error('PREVIEW_DEPLOYMENT_REJECTED_PRIVATE_LOG_RETAINED');
  let deployment;try{const response=JSON.parse(result.out);deployment=response.deployment??response;}catch{throw Error('PREVIEW_RESPONSE_REQUIRES_PRIVATE_REVIEW');}
  if(!deployment.id||!deployment.url||deployment.target==='production')throw Error('PREVIEW_RESPONSE_REQUIRES_PRIVATE_REVIEW');
  const receipt={mode:'PREVIEW_ONLY',deploymentId:deployment.id??null,url:deployment.url??null,canonicalTrafficSwitched:false,
    livePayments:false,sourceAdminCredentialIncluded:false,manifestHash,files:manifest.length,sourceCopy:root};
  await writeFile(join(directory,`candidate-preview-receipt-${stamp}.json`),JSON.stringify(receipt,null,2),{mode:0o600,flag:'wx'});
  console.log(JSON.stringify(receipt));
}catch(error){console.error(JSON.stringify({result:'FAIL',code:/^[A-Z_]+$/.test(error?.message??'')?error.message:'PREVIEW_OPERATION_FAILED',canonicalTrafficSwitched:false}));process.exitCode=1;}
