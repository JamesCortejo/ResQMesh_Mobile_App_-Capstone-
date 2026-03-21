export interface MeshNode {
  id: string
  nodeNumber?: string
  name: string
  latitude?: number | null
  longitude?: number | null
  status?: string
  users?: number
  signal?: number | null
  distress?: boolean
  lastSeen?: string
  distanceMeters?: number | null
}
