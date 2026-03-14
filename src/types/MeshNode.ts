export interface MeshNode {
  id: string;
  name: string;

  latitude?: number | null;
  longitude?: number | null;

  status: 'active' | 'offline';

  distress: boolean;

  users: number;

  signal?: number | null;

  distance?: number | null;

  lastSeen?: string;
}