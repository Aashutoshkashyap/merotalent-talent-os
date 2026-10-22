/** Stable CMS child identifiers, using the existing section/visibility contract. */
export const CONTACT_COMPONENTS = [
  { kind: "address", title: "Our Location" },
  { kind: "phone", title: "Phone Number" },
  { kind: "email", title: "Email Address" },
  { kind: "message", title: "Send us a message" },
] as const;

export type ContactComponentKind = typeof CONTACT_COMPONENTS[number]["kind"];
export const isContactSection = (key: string) => ["contact_form", "contact_us"].includes(key);
export const contactComponentKey = (parentKey: string, kind: ContactComponentKind) => `${parentKey}_${kind}`;
