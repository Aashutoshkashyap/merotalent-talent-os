import {NextResponse} from "next/server";
import {getBackendMode} from "@/lib/server/backend-mode";
import {queryRows} from "@/lib/server/db";
import {getAuthenticatedApplicationUser,NeonSessionUnavailable} from "@/lib/server/neon-session";
import {requireSuperAdmin,NeonAuthorizationError} from "@/lib/server/neon-authorization";
import {publicObjectUrl} from "@/lib/server/application-storage";
import type {MediaModule} from "@/lib/server/media-policy";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store"};
type Row=Record<string,unknown>;
async function image(value:unknown,module:MediaModule,bucket:string){
  if(typeof value !== "string" || !value)return null;
  let path=value;
  if(value.startsWith("https://")){
    const url=new URL(value);
    if(url.hostname !== "dtirpilgzlsfryucanlg.supabase.co")return value;
    const prefix=`/storage/v1/object/public/${bucket}/`;
    if(!url.pathname.startsWith(prefix))return null;
    path=decodeURIComponent(url.pathname.slice(prefix.length));
  }
  try{return await publicObjectUrl(module,path);}catch{return null;}
}
export async function GET(request:Request){
  if(getBackendMode() === "legacy")return new Response(null,{status:404});
  try{
    const actor=await getAuthenticatedApplicationUser(request);requireSuperAdmin(actor);
    const [result]=await queryRows<{allowed:boolean;data:{stats:Record<string,number>;usersList:Row[];jobsList:Row[];
      institutionsList:Row[];competitionsList:Row[];coursesList:Row[];mentorsList:Row[]}}>(`
      WITH access AS (SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id
        JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
        JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
        WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
          AND r.role IN ('admin','super_admin') AND l.neon_auth_user_id=$2::uuid) AS allowed)
      SELECT allowed,CASE WHEN allowed THEN jsonb_build_object(
        'stats',jsonb_build_object('users',(SELECT count(*) FROM public.profiles WHERE deleted_at IS NULL),
          'competitions',(SELECT count(*) FROM public.competitions),'institutions',(SELECT count(*) FROM public.institutes WHERE deleted_at IS NULL),
          'companies',(SELECT count(*) FROM public.companies WHERE deleted_at IS NULL),'mentors',(SELECT count(*) FROM public.mentors WHERE deleted_at IS NULL),
          'jobs',(SELECT count(*) FROM public.jobs WHERE deleted_at IS NULL),'courses',(SELECT count(*) FROM public.courses WHERE is_partnered AND deleted_at IS NULL)),
        'usersList',COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM (SELECT user_id,email,full_name,avatar_url,created_at FROM public.profiles WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10) v),'[]'),
        'jobsList',COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM (SELECT * FROM public.jobs WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10) v),'[]'),
        'institutionsList',COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM (SELECT i.*,COALESCE(d.payment_verified,false) AS payment_verified
          FROM public.institutes i LEFT JOIN public.institute_directory d ON d.id=i.id WHERE i.deleted_at IS NULL ORDER BY i.created_at DESC LIMIT 10) v),'[]'),
        'competitionsList',COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM (SELECT * FROM public.competitions ORDER BY created_at DESC LIMIT 10) v),'[]'),
        'coursesList',COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM (SELECT * FROM public.courses WHERE is_partnered AND deleted_at IS NULL ORDER BY display_order LIMIT 10) v),'[]'),
        'mentorsList',COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM (SELECT m.*,p.full_name,COALESCE(m.profile_image_url,p.avatar_url) AS avatar_url
          FROM public.mentors m LEFT JOIN public.profiles p ON p.user_id=m.user_id WHERE m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 10) v),'[]')
      ) ELSE NULL END AS data FROM access`,[actor.userId,actor.neonAuthUserId]);
    if(!result?.allowed)throw new NeonAuthorizationError(403,"ADMIN_REQUIRED","Administrator access is required.");
    const data=result.data;
    await Promise.all(data.institutionsList.map(async row=>{row.logo_url=await image(row.logo_url,"college_logo","college-media");}));
    await Promise.all(data.mentorsList.map(async row=>{row.avatar_url=await image(row.avatar_url,"mentor_profile","mentor-media");}));
    return NextResponse.json({data:{...data,dataLoadState:"ready"}},{headers});
  }catch(error){return NextResponse.json({error:error instanceof NeonAuthorizationError?error.code:error instanceof NeonSessionUnavailable?"AUTH_UNAVAILABLE":"DASHBOARD_UNAVAILABLE"},
    {status:error instanceof NeonAuthorizationError?error.status:503,headers});}
}
