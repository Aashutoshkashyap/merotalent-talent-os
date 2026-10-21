import {createHmac,randomUUID} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import {decodeEsewaRedirect,EsewaV2PaymentProvider} from './payment-provider';

// Published non-production secret/vector from the requested official /pages/Epay.
const secret='8gBm/:&EnhH.1/q';
const provider=new EsewaV2PaymentProvider(secret,{merchantCode:'EPAYTEST',environment:'uat'});
const signedNames='transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names';
const input={paymentId:'11-201-13',amount:100,currency:'NPR',description:'Test',returnUrl:'https://merotalent.test/return',failureUrl:'https://merotalent.test/failure'};
const sign=(p:Record<string,unknown>)=>({...p,signature:createHmac('sha256',secret).update(String(p.signed_field_names).split(',').map(n=>`${n}=${String(p[n])}`).join(',')).digest('base64')});
const payload=()=>sign({transaction_code:'000AWEO',status:'COMPLETE',total_amount:'100.00',transaction_uuid:input.paymentId,product_code:'EPAYTEST',signed_field_names:signedNames});
const reply=(body:unknown)=>vi.fn(async()=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}})) as unknown as typeof fetch;

describe('official ePay V2 contract and adversarial verification',()=>{
  it('verifies the official encoded success-response signature without reformatting its amount string',()=>{
    const official={transaction_code:'000AWEO',status:'COMPLETE',total_amount:'1000.0',transaction_uuid:'250610-162413',product_code:'EPAYTEST',signed_field_names:signedNames,signature:'62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA='};
    expect(provider.verifyRedirectPayload(decodeEsewaRedirect(Buffer.from(JSON.stringify(official)).toString('base64')))).toBe(true);
    expect(provider.verifyRedirectPayload({...official,total_amount:'1000.00'})).toBe(false);
  });
  it('matches the official 241028 checkout signature vector exactly',async()=>{
    const checkout=await provider.createCheckout({...input,paymentId:'241028',amount:110});
    // The documentation serializes 110, while checkout sends authoritative 110.00.
    // Verify the published vector independently and the actual form against its own exact bytes.
    expect(createHmac('sha256',secret).update('total_amount=110,transaction_uuid=241028,product_code=EPAYTEST').digest('base64')).toBe('i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=');
    const fields=checkout.checkoutFields!;
    expect(fields.signature).toBe(createHmac('sha256',secret).update(`total_amount=${fields.total_amount},transaction_uuid=241028,product_code=EPAYTEST`).digest('base64'));
    expect(Object.keys(fields).sort()).toEqual(['amount','tax_amount','total_amount','transaction_uuid','product_code','product_service_charge','product_delivery_charge','success_url','failure_url','signed_field_names','signature'].sort());
    expect(fields).toMatchObject({amount:'110.00',tax_amount:'0',product_service_charge:'0',product_delivery_charge:'0',success_url:input.returnUrl,failure_url:input.failureUrl});
  });
  it('uses a distinct server-generated transaction UUID for distinct orders',async()=>{
    const a=await provider.createCheckout({...input,paymentId:randomUUID()}),b=await provider.createCheckout({...input,paymentId:randomUUID()});
    expect(a.checkoutFields!.transaction_uuid).not.toBe(b.checkoutFields!.transaction_uuid);
  });
  it.each([0,-1,NaN,Infinity,0.001,0.0000000001,Number.MAX_SAFE_INTEGER])('rejects invalid or rounded money %s',async amount=>{
    expect(await provider.createCheckout({...input,amount})).toMatchObject({status:'failed'});
  });
  it.each(['bad/id','a,b=c','', 'x'.repeat(129)])('rejects malformed transaction UUID %s',async paymentId=>{
    expect((await provider.createCheckout({...input,paymentId})).checkoutFields).toBeUndefined();
  });
  it.each(['javascript:alert(1)','https://user:password@merotalent.test/callback','https://merotalent.test/callback#fragment','http://merchant.test/return'])('rejects unsafe callback %s',async returnUrl=>{
    expect((await provider.createCheckout({...input,returnUrl})).status).toBe('failed');
  });
  it('rejects split callback origins and production HTTP localhost',async()=>{
    expect((await provider.createCheckout({...input,failureUrl:'https://another.test/failure'})).status).toBe('failed');
    const live=new EsewaV2PaymentProvider('not-real',{merchantCode:'LIVE',environment:'production'});
    expect((await live.createCheckout({...input,returnUrl:'http://localhost/return',failureUrl:undefined})).status).toBe('failed');
  });
  it('verifies complete response signatures and denies altered fields',()=>{
    expect(provider.verifyRedirectPayload(payload())).toBe(true);
    for(const field of ['transaction_code','status','total_amount','transaction_uuid','product_code','signed_field_names']){
      expect(provider.verifyRedirectPayload({...payload(),[field]:'tampered'})).toBe(false);
    }
    expect(provider.verifyRedirectPayload(sign({...payload(),product_code:'OTHER'}))).toBe(false);
  });
  it('rejects authentic HMACs that do not cover every mandatory response field',()=>{
    expect(provider.verifyRedirectPayload(sign({...payload(),signed_field_names:'status'}))).toBe(false);
    expect(provider.verifyRedirectPayload(sign({...payload(),total_amount:{nested:100}}))).toBe(false);
  });
  it.each(['', 'not-base64','e30=!!','W10=','bnVsbA==','InRleHQi','a'.repeat(4100)])('rejects malformed encoded callback %s',data=>{
    expect(()=>decodeEsewaRedirect(data)).toThrow();
  });
  it('decodes a bounded response and rejects invalid UTF8',()=>{
    expect(decodeEsewaRedirect(Buffer.from(JSON.stringify(payload())).toString('base64'))).toEqual(payload());
    expect(()=>decodeEsewaRedirect(Buffer.from([0xff,0xfe]).toString('base64'))).toThrow();
  });
  it.each([['COMPLETE','successful'],['PENDING','pending'],['AMBIGUOUS','pending'],['NOT_FOUND','expired'],['CANCELED','cancelled'],['FULL_REFUND','refunded'],['PARTIAL_REFUND','refunded'],['UNKNOWN','pending']])('maps matched %s without speculative fulfillment',async(status,expected)=>{
    const fetcher=reply({product_code:'EPAYTEST',transaction_uuid:input.paymentId,total_amount:100,status,ref_id:'provider-ref'});
    expect((await provider.lookupStatus({reference:input.paymentId,amount:100,strict:true,fetcher})).status).toBe(expected);
    const [url,options]=(fetcher as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toBe('https://rc.esewa.com.np/api/epay/transaction/status/?product_code=EPAYTEST&total_amount=100.00&transaction_uuid=11-201-13');
    expect(options).toMatchObject({redirect:'error',cache:'no-store'});
  });
  it.each([400,404,429,500,503])('HTTP %s remains retryable and never becomes a terminal payment result',async status=>{
    await expect(provider.lookupStatus({reference:input.paymentId,amount:100,strict:true,fetcher:vi.fn(async()=>new Response('{}',{status})) as unknown as typeof fetch})).rejects.toThrow(/verification returned HTTP/);
  });
  it.each([{product_code:'WRONG'},{transaction_uuid:'different-order'},{total_amount:101},{ref_id:null}])('denies mismatched successful status %j',async changed=>{
    await expect(provider.lookupStatus({reference:input.paymentId,amount:100,strict:true,fetcher:reply({product_code:'EPAYTEST',transaction_uuid:input.paymentId,total_amount:100,status:'COMPLETE',ref_id:'real-ref',...changed})})).rejects.toThrow();
  });
  it('does not trust provider errors or malformed JSON as payment failure/success',async()=>{
    for(const body of [null,[],{code:0,error_message:'Service is currently unavailable'}])await expect(provider.lookupStatus({reference:input.paymentId,amount:100,strict:true,fetcher:reply(body)})).rejects.toThrow();
  });
  it('accepts the official V2 scd/pid/totalAmount/refId response with exact matching',async()=>{
    expect(await provider.lookupStatus({reference:input.paymentId,amount:100,strict:true,
      fetcher:reply({scd:'EPAYTEST',pid:input.paymentId,totalAmount:100,status:'COMPLETE',refId:'official-ref'})}))
      .toEqual({status:'successful',transactionId:'official-ref'});
  });
  it.each([{scd:'OTHER'},{pid:'another-order'},{totalAmount:101},{totalAmount:'bad'},{refId:'different-ref'}])('rejects conflicting documented response aliases %j',async changed=>{
    await expect(provider.lookupStatus({reference:input.paymentId,amount:100,strict:true,
      fetcher:reply({product_code:'EPAYTEST',transaction_uuid:input.paymentId,total_amount:100,status:'COMPLETE',ref_id:'real-ref',...changed})})).rejects.toThrow();
  });
});
