/** Sanitized diagnostics for published EPAYTEST credentials only. Never returns keys/signatures/cookies. */
import {createHmac,timingSafeEqual} from 'node:crypto';
const mandatory=['amount','tax_amount','total_amount','transaction_uuid','product_code','product_service_charge','product_delivery_charge','success_url','failure_url','signed_field_names','signature'];
export function diagnoseEsewaUatRequest(checkout,generatedAt,appOrigin){
 const f=checkout?.checkoutFields??{};
 const endpoint='https://rc-epay.esewa.com.np/api/epay/main/v2/form';
 const expected=createHmac('sha256','8gBm/:&EnhH.1/q').update(`total_amount=${f.total_amount},transaction_uuid=${f.transaction_uuid},product_code=${f.product_code}`).digest('base64');
 const actual=Buffer.from(String(f.signature??'')),wanted=Buffer.from(expected);
 const signatureMatches=actual.length===wanted.length&&timingSafeEqual(actual,wanted);
 const encoded=new URLSearchParams(f);let callbacks=null;
 try{const success=new URL(f.success_url),failure=new URL(f.failure_url);callbacks={successOrigin:success.origin,failureOrigin:failure.origin,successPath:success.pathname,failurePath:failure.pathname,
   sameApprovedOrigin:success.origin===appOrigin&&failure.origin===appOrigin&&!success.hash&&!failure.hash&&!success.username&&!failure.username&&!success.password&&!failure.password};}catch{/* malformed URL is reported as invalid */}
 const amount=Number(f.total_amount);
 const valid=checkout?.checkoutUrl===endpoint&&f.product_code==='EPAYTEST'&&mandatory.every(key=>typeof f[key]==='string'&&f[key].length>0)&&
   f.signed_field_names==='total_amount,transaction_uuid,product_code'&&signatureMatches&&Number.isFinite(amount)&&amount>0&&
   Number(f.amount)+Number(f.tax_amount)+Number(f.product_service_charge)+Number(f.product_delivery_charge)===amount&&
   /^[A-Za-z0-9-]{1,128}$/.test(f.transaction_uuid??'')&&callbacks?.sameApprovedOrigin===true&&Object.keys(f).every(key=>encoded.get(key)===f[key]);
 return {generatedAt,endpoint,transactionUuid:f.transaction_uuid,merchant:f.product_code,totalAmount:f.total_amount,
   mandatoryFieldsPresent:mandatory.every(key=>typeof f[key]==='string'&&f[key].length>0),signatureMatchesPublishedUatSecret:signatureMatches,
   signedFields:f.signed_field_names,callbacks,valid,settlementVerified:false};
}
