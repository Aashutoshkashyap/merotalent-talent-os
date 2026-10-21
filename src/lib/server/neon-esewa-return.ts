import {NextResponse} from 'next/server';
import {NeonAuthorizationError} from './neon-authorization';
import {NeonCheckoutService} from './neon-checkout';
import {decodeEsewaRedirect} from './payment-provider';

/** Shared canonical/compatibility callback: no legacy database fallback. */
export async function handleNeonEsewaReturn(request: Request) {
  const url=new URL(request.url);
  let params=url.searchParams;
  const invalid=()=>NextResponse.json({error:'INVALID_PROVIDER_PAYLOAD'},{status:400,headers:{'cache-control':'no-store'}});
  if(request.method==='POST'){
    if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return invalid();
    const reader=request.body?.getReader();if(!reader)return invalid();
    const parts:Uint8Array[]=[];let length=0;
    for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;
      if(length>16_384){await reader.cancel();return invalid();}parts.push(value);}
    try{params=new URLSearchParams(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));}catch{return invalid();}
  }
  const encoded=params.get('data');let payload:Record<string,unknown>|null=null;
  if(encoded!==null){try{payload=decodeEsewaRedirect(encoded);}catch{return invalid();}}
  const reference=payload?.transaction_uuid??params.get('reference');
  if(typeof reference!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference)){
    return NextResponse.json({error:'INVALID_REFERENCE'},{status:400,headers:{'cache-control':'no-store'}});
  }
  try{
    await new NeonCheckoutService().verifyReturn({reference,signedPayload:payload});
    return NextResponse.redirect(new URL(`/dashboard/payments?checkout=${encodeURIComponent(reference)}`,url.origin),{headers:{'cache-control':'no-store'}});
  }catch(error){
    if(error instanceof NeonAuthorizationError)return NextResponse.json({error:error.code},{status:error.status,headers:{'cache-control':'no-store'}});
    return NextResponse.json({error:'VERIFICATION_UNAVAILABLE'},{status:503,headers:{'cache-control':'no-store'}});
  }
}
