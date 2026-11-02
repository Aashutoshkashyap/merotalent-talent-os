/** Server-buffered, ownership-bound listing media using the established Neon storage adapter. */
import type {PoolClient,QueryResultRow} from "pg";
import sharp from "sharp";
import {withTransaction} from "./db";
import {NeonAuthorizationError,requireEntityAccess,type EntityType,type NeonActor} from "./neon-authorization";
import {assertMediaObjectPath,buildMediaObjectPath,mediaPolicies,parseMediaDownloadIntent,parseMediaUploadIntent,type MediaModule} from "./media-policy";
import {createPresignedDownloadUrl,deleteObject,headObject,uploadObject} from "./storage";

type Run=<T>(operation:(client:PoolClient)=>Promise<T>)=>Promise<T>;
const publicModules=new Set<MediaModule>(["college_logo","college_cover","college_gallery","mentor_profile","event_cover","course_thumbnail","advertisement","company_logo"]);
const managedModules=new Set<MediaModule>([...publicModules,"event_attachment"]);
const relations:Partial<Record<MediaModule,{table:string;module:string;type:EntityType;fields:string[]}>>={
  company_logo:{table:"companies",module:"jobs",type:"company",fields:["logo_url"]},
  college_logo:{table:"institutes",module:"college",type:"college",fields:["logo_url"]},
  college_cover:{table:"institutes",module:"college",type:"college",fields:["cover_image_url"]},
  college_gallery:{table:"institutes",module:"college",type:"college",fields:["gallery_urls"]},
  mentor_profile:{table:"mentors",module:"mentor",type:"mentor",fields:["profile_image_url","cover_image_url"]},
  event_cover:{table:"events",module:"events",type:"event",fields:["cover_image_url","logo_url","gallery_urls"]},
  event_attachment:{table:"events",module:"events",type:"event",fields:["attachment_path"]},
  course_thumbnail:{table:"courses",module:"courses",type:"course",fields:["thumbnail_url"]},
  advertisement:{table:"advertisements",module:"advertisements",type:"course",fields:["image_url"]},
};
type Storage={head:typeof headObject;put:typeof uploadObject;remove:typeof deleteObject;sign:typeof createPresignedDownloadUrl};
const storage:Storage={head:headObject,put:uploadObject,remove:deleteObject,sign:createPresignedDownloadUrl};

export class NeonManagedMediaError extends Error {
  constructor(readonly status:number,readonly code:string,message:string){super(message);this.name="NeonManagedMediaError";}
}
const denied=()=>{throw new NeonAuthorizationError(403,"MEDIA_ACCESS_DENIED","You cannot manage media for this listing.");};

export async function validateManagedMediaBytes(bytes:Uint8Array,mime:string):Promise<void>{
  const starts=(...values:number[])=>values.every((value,index)=>bytes[index]===value);
  if(mime.startsWith("image/")){
    const signatures:Record<string,boolean>={"image/png":starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a),"image/jpeg":starts(0xff,0xd8,0xff),
      "image/webp":starts(0x52,0x49,0x46,0x46)&&String.fromCharCode(...bytes.slice(8,12))==="WEBP",
      "image/avif":String.fromCharCode(...bytes.slice(4,12))==="ftypavif"};
    if(!signatures[mime])throw new NeonManagedMediaError(415,"INVALID_IMAGE","The image contents do not match its type.");
    try{
      const meta=await sharp(bytes,{limitInputPixels:40_000_000}).metadata();
      if(!meta.width||!meta.height||meta.width*meta.height>40_000_000)throw new Error();
    }catch{throw new NeonManagedMediaError(415,"INVALID_IMAGE","Choose a valid image.");}
    return;
  }
  const valid=mime==="application/pdf" ? String.fromCharCode(...bytes.slice(0,5))==="%PDF-"
    : mime==="application/msword" ? starts(0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1)
    : mime==="application/vnd.openxmlformats-officedocument.wordprocessingml.document" && starts(0x50,0x4b,0x03,0x04);
  if(!valid)throw new NeonManagedMediaError(415,"INVALID_DOCUMENT","The document contents do not match its type.");
}

async function requireListingMedia(client:PoolClient,actor:NeonActor,module:MediaModule,id:string){
  if(!managedModules.has(module))throw new NeonManagedMediaError(403,"DEDICATED_MEDIA_WORKFLOW_REQUIRED","Use the document workflow for this module.");
  const [identity]=(await client.query<{admin:boolean}>(`SELECT EXISTS(SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id=p.user_id AND ur.role IN ('admin','super_admin')) AS admin
    FROM public.profiles p JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
    JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
    WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid AND p.account_status='active' AND p.deleted_at IS NULL
    FOR SHARE OF p,a,l`,[actor.userId,actor.neonAuthUserId])).rows;
  if(!identity || (actor.platformAdmin&&!identity.admin))denied();
  const relation=relations[module]!;
  if(module==="advertisement"&&!identity.admin)denied();
  if(!identity.admin){
    await requireEntityAccess({...actor,platformAdmin:false},relation.module,relation.type,id,"media_management",{
      query:async<T extends QueryResultRow>(sql:string,values:readonly unknown[])=>(await client.query<T>(sql,[...values])).rows});
    // Hold the authorized scope and entitlement until the storage mutation and audit commit.
    await client.query(`SELECT id FROM public.entity_admin_assignments WHERE user_id=$1::uuid
      AND entity_type=$2 AND entity_id=$3::uuid AND status='active' FOR SHARE`,[actor.userId,relation.type,id]);
    await client.query(`SELECT id FROM public.module_entitlements WHERE user_id=$1::uuid
      AND module_key=$2 AND entity_type=$3 AND entity_id=$4::uuid AND status='active'
      AND start_at<=now() AND (expires_at IS NULL OR expires_at>now()) FOR SHARE`,[actor.userId,relation.module,relation.type,id]);
  }else{
    await client.query(`SELECT id FROM public.user_roles WHERE user_id=$1::uuid AND role IN ('admin','super_admin') FOR SHARE`,[actor.userId]);
  }
  const target=await client.query(`SELECT id FROM public.${relation.table} WHERE id=$1::uuid AND deleted_at IS NULL FOR SHARE`,[id]);
  if(!target.rowCount)throw new NeonAuthorizationError(404,"MEDIA_RESOURCE_NOT_FOUND","Listing unavailable.");
  return relation;
}

export async function uploadNeonManagedMedia(actor:NeonActor,input:{module:string;resourceId:string;fileName:string;contentType:string;bytes:Uint8Array},
  run:Run=withTransaction,io:Storage=storage){
  const intent=parseMediaUploadIntent({module:input.module,resourceId:input.resourceId,fileName:input.fileName,
    contentType:input.contentType,sizeBytes:input.bytes.byteLength});
  return uploadValidated(actor,intent,input.bytes,run,io);
}

async function uploadValidated(actor:NeonActor,intent:ReturnType<typeof parseMediaUploadIntent>,bytes:Uint8Array,run:Run,io:Storage){
  if(!intent.resourceId)throw new NeonAuthorizationError(400,"MEDIA_RESOURCE_REQUIRED","Save the listing before uploading media.");
  await validateManagedMediaBytes(bytes,intent.contentType);
  const path=buildMediaObjectPath(intent,actor.userId);
  const bucket=mediaPolicies[intent.module].bucket;
  let stored=false;
  try{return await run(async client=>{
    await requireListingMedia(client,actor,intent.module,intent.resourceId!);
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))`,[actor.userId]);
    const [quota]=(await client.query<{count:number;bytes:string}>(`SELECT count(*)::int AS count,COALESCE(sum(declared_size),0)::text AS bytes
      FROM public.media_upload_intents WHERE user_id=$1::uuid AND created_at>now()-interval '1 hour'`,[actor.userId])).rows;
    if((quota?.count??0)>=30||Number(quota?.bytes??0)+bytes.byteLength>104857600)
      throw new NeonManagedMediaError(429,"MEDIA_RATE_LIMITED","The hourly upload limit has been reached. Try again later.");
    if(await io.head(bucket,path))throw new NeonManagedMediaError(409,"MEDIA_ALREADY_EXISTS","Existing objects cannot be overwritten.");
    await client.query(`INSERT INTO public.media_upload_intents(user_id,module,resource_id,object_path,declared_size)
      VALUES($1::uuid,$2,$3::uuid,$4,$5)`,[actor.userId,intent.module,intent.resourceId,path,bytes.byteLength]);
    await io.put(bucket,path,bytes,intent.contentType);stored=true;
    const checked=await io.head(bucket,path);
    if(checked?.contentLength!==bytes.byteLength||checked.contentType!==intent.contentType)
      throw new NeonManagedMediaError(503,"MEDIA_VERIFICATION_FAILED","The uploaded object could not be verified.");
    const preview=publicModules.has(intent.module)?await io.sign(bucket,path,3600,false):null;
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES($1::uuid,'upload_listing_media',$2,$3::text,jsonb_build_object('module',$4::text,'object_path',$5::text,'size',$6::int))`,
    [actor.userId,relations[intent.module]!.type,intent.resourceId,intent.module,path,bytes.byteLength]);
    return{bucket,path,publicUrl:preview?.signedUrl??"",fileName:intent.fileName,contentType:intent.contentType};
  });}catch(error){if(stored)await io.remove(bucket,path).catch(()=>undefined);throw error;}
}

function referenceConditions(module:MediaModule){
  return relations[module]!.fields.map(field=>field==="gallery_urls"?`$2=ANY(gallery_urls)`:`${field}=$2`).join(" OR ");
}
function allBucketReferences(module:MediaModule){
  const fields=new Set(Object.entries(relations).filter(([other,relation])=>relation?.table===relations[module]!.table&&
    mediaPolicies[other as MediaModule].bucket===mediaPolicies[module].bucket).flatMap(([,relation])=>relation!.fields));
  return [...fields].map(field=>field==="gallery_urls"?`$1=ANY(gallery_urls)`:`${field}=$1`).join(" OR ");
}

export async function downloadNeonManagedMedia(actor:NeonActor,input:unknown,run:Run=withTransaction,io:Storage=storage){
  const intent=parseMediaDownloadIntent(input);
  if(!intent.resourceId)throw new NeonAuthorizationError(400,"MEDIA_RESOURCE_REQUIRED","Choose a listing.");
  try{assertMediaObjectPath(intent,actor.userId,true);}catch(error){
    // Imported references may predate canonical upload paths. They still require
    // exact listing metadata and entity authorization before a signed read.
    if(!intent.path||intent.path.includes(":")||intent.path.includes("%")||intent.path.includes("\\")||
      intent.path.split("/").some(segment=>!segment||segment==="."||segment==="..")||/[\u0000-\u001f]/.test(intent.path))throw error;
  }
  return run(async client=>{
    const relation=await requireListingMedia(client,actor,intent.module,intent.resourceId!);
    const row=await client.query(`SELECT id FROM public.${relation.table} WHERE id=$1::uuid AND (${referenceConditions(intent.module)}) AND deleted_at IS NULL`,[intent.resourceId,intent.path]);
    if(!row.rowCount)throw new NeonAuthorizationError(404,"MEDIA_NOT_REFERENCED","This file is not attached to the listing.");
    const policy=mediaPolicies[intent.module];
    const file=await io.head(policy.bucket,intent.path);
    if(!file)throw new NeonAuthorizationError(404,"MEDIA_NOT_FOUND","File unavailable.");
    if(!file.contentType||!policy.mimeTypes.includes(file.contentType)||!file.contentLength||file.contentLength>policy.maxBytes)
      throw new NeonManagedMediaError(422,"MEDIA_POLICY_VIOLATION","The stored file failed its security checks.");
    return{bucket:policy.bucket,path:intent.path,...await io.sign(policy.bucket,intent.path,intent.expiresIn,intent.module==="event_attachment"||intent.download)};
  });
}

export async function deleteNeonManagedMedia(actor:NeonActor,input:unknown,run:Run=withTransaction,io:Storage=storage){
  const intent=parseMediaDownloadIntent(input);
  if(!intent.resourceId)throw new NeonAuthorizationError(400,"MEDIA_RESOURCE_REQUIRED","Choose a listing.");
  assertMediaObjectPath(intent,actor.userId,false);
  return run(async client=>{
    const relation=await requireListingMedia(client,actor,intent.module,intent.resourceId!);
    const own=await client.query(`SELECT id FROM public.media_upload_intents WHERE user_id=$1::uuid
      AND module=$2 AND resource_id=$3::uuid AND object_path=$4 FOR UPDATE`,[actor.userId,intent.module,intent.resourceId,intent.path]);
    if(!own.rowCount)throw new NeonAuthorizationError(404,"MEDIA_NOT_FOUND","Owned upload unavailable.");
    const refs=await client.query(`SELECT id FROM public.${relation.table} WHERE (${allBucketReferences(intent.module)}) LIMIT 1`,[intent.path]);
    if(refs.rowCount)throw new NeonAuthorizationError(409,"MEDIA_STILL_REFERENCED","Save the listing without this media before deleting the file.");
    await io.remove(mediaPolicies[intent.module].bucket,intent.path);
    await client.query(`DELETE FROM public.media_upload_intents WHERE object_path=$1 AND user_id=$2::uuid`,[intent.path,actor.userId]);
    await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      VALUES($1::uuid,'delete_listing_media',$2,$3::text,jsonb_build_object('object_path',$4::text))`,[actor.userId,relation.type,intent.resourceId,intent.path]);
    return{deleted:true};
  });
}
