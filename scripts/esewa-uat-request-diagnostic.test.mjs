import {test} from 'node:test';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';
import {diagnoseEsewaUatRequest} from './esewa-uat-request-diagnostic.mjs';
const fields={amount:'10.00',tax_amount:'0',total_amount:'10.00',transaction_uuid:'test-123',product_code:'EPAYTEST',product_service_charge:'0',product_delivery_charge:'0',success_url:'http://localhost:3001/return',failure_url:'http://localhost:3001/return?state=failed',signed_field_names:'total_amount,transaction_uuid,product_code'};
const signature=createHmac('sha256','8gBm/:&EnhH.1/q').update('total_amount=10.00,transaction_uuid=test-123,product_code=EPAYTEST').digest('base64');
const checkout={checkoutUrl:'https://rc-epay.esewa.com.np/api/epay/main/v2/form',checkoutFields:{...fields,signature}};
test('validates official UAT form without returning secret, signature or callback query',()=>{
 const result=diagnoseEsewaUatRequest(checkout,'timestamp','http://localhost:3001');assert.equal(result.valid,true);
 const json=JSON.stringify(result);for(const value of [signature,'8gBm/:&EnhH.1/q','state=failed'])assert.ok(!json.includes(value));
});
test('does not report valid for altered amount, merchant, signature, endpoint or callback',()=>{
 for(const patch of [{total_amount:'11.00'},{product_code:'LIVE'},{signature:'invalid'},{failure_url:'https://another.test/return'}])
   assert.equal(diagnoseEsewaUatRequest({...checkout,checkoutFields:{...checkout.checkoutFields,...patch}},'timestamp','http://localhost:3001').valid,false);
 assert.equal(diagnoseEsewaUatRequest({...checkout,checkoutUrl:'https://epay.esewa.com.np/api/epay/main/v2/form'},'timestamp','http://localhost:3001').valid,false);
});
