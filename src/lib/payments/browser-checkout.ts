export interface BrowserCheckoutResponse {
  checkoutUrl: string;
  checkoutFields: Record<string, string>;
}

export const postSignedCheckoutForm = ({ checkoutUrl, checkoutFields }: BrowserCheckoutResponse) => {
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
  form.submit();
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
