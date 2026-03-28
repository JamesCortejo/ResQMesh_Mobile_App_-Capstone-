export interface MeshNode {
  id: string;
  nodeNumber?: string;
  name: string;

  // Supports both API formats
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;

  status?: string;
  users?: number;
  signal?: string | number | null;
  distress?: boolean;
  lastSeen?: string;
  distanceMeters?: number | null;
}

export interface DistressDetail {
  id: number;
  code?: string;
  reason?: string;
  lat?: number | null;
  lng?: number | null;
  timestamp?: string;
  status?: string;
  priority?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bloodType?: string;
    occupation?: string;
    age?: number;
    address?: string;
  };
}