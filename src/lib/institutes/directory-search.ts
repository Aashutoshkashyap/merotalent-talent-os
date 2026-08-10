export const cleanInstituteFilterText = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

export const tokenizeInstituteSearch = (value: string) =>
  cleanInstituteFilterText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 8);
