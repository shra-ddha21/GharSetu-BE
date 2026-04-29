/**
 * Geocoding utility using OpenStreetMap Nominatim (free, no API key).
 * Converts a text location (e.g., "Pune", "Delhi") to lat/lng coordinates.
 */

export const geocodeLocation = async (locationText) => {
  if (!locationText || locationText.trim() === '') return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText.trim())}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GharSetu/1.0 (gharsetu-dev@example.com)'
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }

    return null;
  } catch (error) {
    console.error(`[Geocode] Failed to geocode "${locationText}":`, error.message);
    return null;
  }
};
