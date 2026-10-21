/** Never send staging session cookies or generated credentials to an arbitrary origin. */
export function stagingUatOrigin(environment=process.env){
 const origin=environment.NEON_STAGING_UAT_APP_ORIGIN??'http://localhost:3210';
 if(!['http://localhost:3001','http://localhost:3210'].includes(origin))throw Error('ISOLATED_LOCAL_UAT_ORIGIN_REQUIRED');
 return origin;
}
