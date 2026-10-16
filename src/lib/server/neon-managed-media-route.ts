import {NextResponse} from "next/server";
import {getBackendMode} from "@/lib/server/backend-mode";
import {getAuthenticatedApplicationUser,NeonSessionUnavailable,requireSameOrigin} from "@/lib/server/neon-session";
import {NeonAuthorizationError} from "@/lib/server/neon-authorization";
import {MediaPolicyError} from "@/lib/server/media-policy";
import {NeonDatabaseError} from "@/lib/server/db";
import {ApiRequestError,readJsonObject} from "@/lib/server/request";
import {deleteNeonManagedMedia,downloadNeonManagedMedia,NeonManagedMediaError,uploadNeonManagedMedia} from "@/lib/server/neon-managed-media";
const headers={"Cache-Control":"private, no-store"};
const maxBodyBytes=10*1024*1024+65536;
async function readBoundedMultipart(request:Request){
  const reader=request.body?.getReader();
  if(!reader)throw new NeonManagedMediaError(422,"INVALID_MEDIA_BODY","Choose a file.");
  const chunks:Uint8Array[]=[];let length=0;
  while(true){
    const chunk=await reader.read();if(chunk.done)break;
    length+=chunk.value.byteLength;
    if(length>maxBodyBytes){await reader.cancel().catch(()=>undefined);throw new NeonManagedMediaError(413,"FILE_TOO_LARGE","Choose a smaller file.");}
    chunks.push(chunk.value);
  }
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return new Response(bytes.buffer,{headers:{"Content-Type":request.headers.get("content-type")??""}}).formData();
}
export function managedMediaFailure(error:unknown){
  const cause=error instanceof NeonDatabaseError?error.cause:error;
  const known=cause instanceof NeonAuthorizationError||cause instanceof MediaPolicyError||cause instanceof NeonManagedMediaError||cause instanceof ApiRequestError;
  return NextResponse.json({data:null,error:{code:known?cause.code:cause instanceof NeonSessionUnavailable?"AUTH_UNAVAILABLE":"MEDIA_UNAVAILABLE",
    message:known?cause.message:"Media service unavailable."}},{status:known?cause.status:503,headers});
}
export async function handleManagedMediaUpload(request:Request){
  if(getBackendMode()!=="neon-staging")return new Response(null,{status:404});
  try{
    requireSameOrigin(request);
    const actor=await getAuthenticatedApplicationUser(request);
    const length=Number(request.headers.get("content-length"));
    if(!Number.isSafeInteger(length)||length<1)throw new NeonManagedMediaError(411,"LENGTH_REQUIRED","The file size is required.");
    if(length>maxBodyBytes)throw new NeonManagedMediaError(413,"FILE_TOO_LARGE","Choose a smaller file.");
    if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))throw new NeonManagedMediaError(415,"FILE_UPLOAD_REQUIRED","Upload the file using the media form.");
    const form=await readBoundedMultipart(request);
    if(!form||[...form.keys()].some(key=>!["module","resourceId","file"].includes(key)||form!.getAll(key).length!==1))
      throw new NeonManagedMediaError(422,"INVALID_MEDIA_BODY","Choose a file and its listing.");
    const file=form.get("file"),selectedModule=form.get("module"),resourceId=form.get("resourceId");
    if(!(file instanceof File)||typeof selectedModule!=="string"||typeof resourceId!=="string")
      throw new NeonManagedMediaError(422,"INVALID_MEDIA_BODY","Choose a file and its listing.");
    const data=await uploadNeonManagedMedia(actor,{module:selectedModule,resourceId,fileName:file.name,contentType:file.type,bytes:new Uint8Array(await file.arrayBuffer())});
    return NextResponse.json({data,error:null},{status:201,headers});
  }catch(error){return managedMediaFailure(error);}
}
export async function handleManagedMediaDownload(request:Request){
  if(getBackendMode()!=="neon-staging")return new Response(null,{status:404});
  try{
    requireSameOrigin(request);
    const actor=await getAuthenticatedApplicationUser(request);
    const data=await downloadNeonManagedMedia(actor,await readJsonObject(request,8192));
    return NextResponse.json({data,error:null},{headers});
  }catch(error){return managedMediaFailure(error);}
}
export async function handleManagedMediaDelete(request:Request){
  if(getBackendMode()!=="neon-staging")return new Response(null,{status:404});
  try{
    requireSameOrigin(request);
    const actor=await getAuthenticatedApplicationUser(request);
    const data=await deleteNeonManagedMedia(actor,await readJsonObject(request,8192));
    return NextResponse.json({data,error:null},{headers});
  }catch(error){return managedMediaFailure(error);}
}
