export interface MeshNode {
  id: string;
  nodeNumber: number;
  name: string;

  latitude: number;
  longitude: number;

  status: 'active' | 'offline';
  distress: boolean;

  users: number;
  signal: string;
}
