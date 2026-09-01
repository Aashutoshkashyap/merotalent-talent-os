import { describe, expect, it } from "vitest";
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsSearchUrl,
} from "./map-location";

describe("college map location helpers", () => {
  it("always creates a Google Maps embed URL from the saved location", () => {
    expect(getGoogleMapsEmbedUrl("27.6774, 85.3188")).toBe(
      "https://www.google.com/maps?output=embed&q=27.6774%2C%2085.3188",
    );
  });

  it("encodes input instead of treating it as an iframe URL", () => {
    const source = "https://untrusted.example/?location=campus";
    expect(getGoogleMapsEmbedUrl(source)).toContain(
      "https%3A%2F%2Funtrusted.example%2F%3Flocation%3Dcampus",
    );
    expect(getGoogleMapsSearchUrl(source)).toContain(
      "https%3A%2F%2Funtrusted.example%2F%3Flocation%3Dcampus",
    );
  });

  it("does not render a map when the college has no pin", () => {
    expect(getGoogleMapsEmbedUrl("  ")).toBeNull();
    expect(getGoogleMapsSearchUrl(null)).toBeNull();
  });
});
