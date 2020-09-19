export interface GoogleMetadata {
  title: string;
  description: string;
  imageViews: string;
  creationTime: GoogleTimestamp;
  modificationTime: GoogleTimestamp;
  geoData: GeoData;
  geoDataExif: GeoData;
  photoTakenTime: GoogleTimestamp;
  favorited: boolean;
}

interface GeoData {
  latitude: number;
  longitude: number;
  altitude: number;
  latitudeSpan: number;
  longitudeSpan: number;
}

interface GoogleTimestamp {
  timestamp: string;
  formatted: string;
}
