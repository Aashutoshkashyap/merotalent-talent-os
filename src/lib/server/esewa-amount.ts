/** ePay's signed callback example uses "1,000.0". Normalize only AFTER HMAC
 * verification; never parseFloat (which would silently turn that into 1).
 */
export function parseEsewaAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string" || value.length > 32 ||
      !(/^[0-9]+(?:\.[0-9]{1,2})?$/.test(value) ||
        /^[1-9][0-9]{0,2}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?$/.test(value))) return NaN;
  return Number(value.replaceAll(",", ""));
}
