export interface BrowserCheckoutResponse {
  checkoutUrl: string;
  checkoutFields: Record<string, string>;
}

export const postSignedCheckoutForm = ({ checkoutUrl, checkoutFields }: BrowserCheckoutResponse) => {
  // Port the reference's auto-submitting POST form without interpolating HTML.
  // Treat the API response as untrusted: never POST signed fields to another host.
  const gateways = ["https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    "https://epay.esewa.com.np/api/epay/main/v2/form"];
  const fields = ["amount", "tax_amount", "total_amount", "transaction_uuid", "product_code",
    "product_service_charge", "product_delivery_charge", "success_url", "failure_url",
    "signed_field_names", "signature"];
  if (!gateways.includes(checkoutUrl) || !checkoutFields || Array.isArray(checkoutFields) ||
      Object.keys(checkoutFields).length !== fields.length ||
      fields.some(name => typeof checkoutFields[name] !== "string" || !checkoutFields[name])) {
    throw new Error("Invalid secure eSewa checkout form.");
  }
  if ((checkoutUrl === gateways[1] && checkoutFields.product_code === "EPAYTEST") ||
      (checkoutUrl === gateways[0] && checkoutFields.product_code !== "EPAYTEST")) {
    throw new Error("Mixed eSewa checkout environment.");
  }
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.style.display = "none";
  for (const [name, value] of Object.entries(checkoutFields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  try { form.submit(); } finally { form.remove(); }
};

export async function startEsewaCheckout(
  accessToken: string,
  request: Record<string, string>,
) {
  const response = await fetch("/api/v1/payments/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload = await response.json().catch(() => null);
  const checkoutUrl = payload?.data?.checkoutUrl;
  const checkoutFields = payload?.data?.checkoutFields;
  if (!response.ok || typeof checkoutUrl !== "string" || !checkoutFields || typeof checkoutFields !== "object") {
    throw new Error(payload?.error?.message || "eSewa checkout could not be started.");
  }
  postSignedCheckoutForm({ checkoutUrl, checkoutFields });
}
