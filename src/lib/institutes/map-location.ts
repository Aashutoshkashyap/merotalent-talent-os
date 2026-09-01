export const getGoogleMapsEmbedUrl = (location: string | null | undefined) => {
  const query = location?.trim();
  return query
    ? `https://www.google.com/maps?output=embed&q=${encodeURIComponent(query)}`
    : null;
};

export const getGoogleMapsSearchUrl = (location: string | null | undefined) => {
  const query = location?.trim();
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
};
