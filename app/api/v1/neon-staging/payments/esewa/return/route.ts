import {getBackendMode} from '@/lib/server/backend-mode';
import {handleNeonEsewaReturn} from '@/lib/server/neon-esewa-return';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(request:Request){
  if(getBackendMode()==='legacy')return new Response(null,{status:404});
  return handleNeonEsewaReturn(request);
}
export const POST=GET;
