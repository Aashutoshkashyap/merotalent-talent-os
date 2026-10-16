/** Preserve PostgreSQL JSON numeric values during local semantic comparison. */
export class SnapshotNumber {
  constructor(literal) { this.literal=normalizeNumber(literal); }
}
function normalizeNumber(literal) {
  const match=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(literal);
  if(!match)throw new Error("Invalid snapshot numeric token.");
  let digits=(match[2]+(match[3]??"")).replace(/^0+/,"") || "0";
  let scale=(match[3]?.length??0)-Number(match[4]??0);
  if(!Number.isSafeInteger(scale)||Math.abs(scale)>100000)throw new Error("Snapshot numeric scale is unsupported.");
  while(digits.endsWith("0")&&digits!=="0"){digits=digits.slice(0,-1);scale--;}
  if(digits==="0")return "0";
  return `${match[1]}${digits}e${-scale}`;
}
export function parseLosslessSnapshotRow(text) {
  return JSON.parse(text,(_key,value,context)=>{
    if(typeof value!=="number")return value;
    if(typeof context?.source!=="string")throw new Error("Lossless JSON primitive source support is required.");
    return new SnapshotNumber(context.source);
  });
}
