import api from './api';
import cloudApi from './cloudApi';

export type TileSource = 'online' | 'local' | 'none';

export type LngLat = [number, number];

export type LiveRouteResponse = {
  assignment: {
    id: number;
    distress_id: number;
    team_id: number | null;
    rescuer_id: number | null;
    assigned_at: string | null;
    eta_minutes: number | null;
    status: string;
    distress: {
      code: string;
      reason: string;
      latitude: number | null;
      longitude: number | null;
      timestamp: string | null;
      priority: string;
      user: {
        firstName: string;
        lastName: string;
        phone: string;
        bloodType: string;
        age: number;
      };
    };
  };
  rescuer_location: {
    latitude: number | null;
    longitude: number | null;
    recorded_at: string | null;
  };
  route: {
    distance_m: number | null;
    duration_s: number | null;
    eta_minutes: number | null;
    coordinates: LngLat[];
  };
};

export type RouteFetchStatus = 'available' | 'no-assignment' | 'unavailable';

export type RouteFetchResult = {
  status: RouteFetchStatus;
  data: LiveRouteResponse | null;
  message: string | null;
};

const toEtaNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildEtaOnlyRouteResponse = (etaMinutes: number): LiveRouteResponse => ({
  assignment: {
    id: 0,
    distress_id: 0,
    team_id: null,
    rescuer_id: null,
    assigned_at: null,
    eta_minutes: etaMinutes,
    status: 'assigned',
    distress: {
      code: 'ACTIVE',
      reason: 'Emergency response in progress',
      latitude: null,
      longitude: null,
      timestamp: null,
      priority: 'unknown',
      user: {
        firstName: '',
        lastName: '',
        phone: '',
        bloodType: '',
        age: 0,
      },
    },
  },
  rescuer_location: {
    latitude: null,
    longitude: null,
    recorded_at: null,
  },
  route: {
    distance_m: null,
    duration_s: null,
    eta_minutes: etaMinutes,
    coordinates: [],
  },
});

type ActiveDistressContext = {
  nodeIds: string[];
  distressIds: number[];
};

type ApiClient = {
  get: <T = unknown>(url: string) => Promise<{ data: T }>;
};

const hasRouteShape = (value: unknown): value is LiveRouteResponse => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  if (!payload.route || typeof payload.route !== 'object') return false;

  const route = payload.route as Record<string, unknown>;
  return Array.isArray(route.coordinates);
};

const normalizeNoRouteMessage = (errorPayload: unknown): string => {
  if (!errorPayload || typeof errorPayload !== 'object') {
    return 'No active rescue route.';
  }

  const payload = errorPayload as { error?: unknown; details?: unknown };

  const errorText = typeof payload.error === 'string' ? payload.error : '';
  const detailsText = typeof payload.details === 'string' ? payload.details : '';
  const merged = `${errorText} ${detailsText}`.toLowerCase();

  if (
    merged.includes('no active assignment') ||
    merged.includes('no active distress') ||
    merged.includes('not found')
  ) {
    return 'No active rescue route.';
  }

  return 'No active rescue route.';
};

const looksLikeNoAssignment = (errorPayload: unknown): boolean => {
  if (!errorPayload || typeof errorPayload !== 'object') {
    return false;
  }

  const payload = errorPayload as { error?: unknown; details?: unknown };
  const errorText = typeof payload.error === 'string' ? payload.error : '';
  const detailsText = typeof payload.details === 'string' ? payload.details : '';
  const merged = `${errorText} ${detailsText}`.toLowerCase();

  return (
    merged.includes('no active assignment') ||
    merged.includes('no active distress') ||
    merged.includes('assignment not found')
  );
};

const normalizeUnavailableMessage = (errorPayload: unknown): string => {
  if (!errorPayload || typeof errorPayload !== 'object') {
    return 'Live route unavailable.';
  }

  const payload = errorPayload as { error?: unknown; details?: unknown };
  const errorText = typeof payload.error === 'string' ? payload.error : '';
  const detailsText = typeof payload.details === 'string' ? payload.details : '';

  if (errorText || detailsText) {
    return `${errorText || 'Live route unavailable.'}${detailsText ? ` (${detailsText})` : ''}`;
  }

  return 'Live route unavailable.';
};

const toUniqueStrings = (values: string[]): string[] => {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
};

const toUniqueNumbers = (values: number[]): number[] => {
  return Array.from(new Set(values.filter(value => Number.isFinite(value))));
};

const readNodeId = (record: Record<string, unknown>): string | null => {
  const direct = record.node_id ?? record.nodeId ?? record.id;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  return null;
};

const readDistressId = (record: Record<string, unknown>): number | null => {
  const candidates = [record.active_distress_id, record.distress_id, record.distressId, record.id];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const extractActiveDistressContext = (payload: unknown): ActiveDistressContext => {
  const nodeIds: string[] = [];
  const distressIds: number[] = [];

  const inspectRecord = (record: Record<string, unknown>) => {
    const statusText = [
      typeof record.status === 'string' ? record.status : '',
      typeof record.health_status === 'string' ? record.health_status : '',
      typeof record.distress_status === 'string' ? record.distress_status : '',
    ]
      .join(' ')
      .toLowerCase();

    const hasActiveSignal =
      Boolean(record.active_distress) ||
      Boolean(record.activeDistress) ||
      Boolean(record.current_distress) ||
      Boolean(record.currentDistress) ||
      Boolean(record.active_distress_id) ||
      statusText.includes('active distress') ||
      statusText.includes('distress active') ||
      statusText.includes('active');

    if (!hasActiveSignal) {
      return;
    }

    const nodeId = readNodeId(record);
    if (nodeId) {
      nodeIds.push(nodeId);
    }

    const directDistressId = readDistressId(record);
    if (directDistressId !== null) {
      distressIds.push(directDistressId);
    }

    if (record.active_distress && typeof record.active_distress === 'object') {
      const nested = record.active_distress as Record<string, unknown>;
      const nestedDistressId = readDistressId(nested);
      if (nestedDistressId !== null) {
        distressIds.push(nestedDistressId);
      }
      const nestedNodeId = readNodeId(nested);
      if (nestedNodeId) {
        nodeIds.push(nestedNodeId);
      }
    }
  };

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === 'object') {
        inspectRecord(item as Record<string, unknown>);
      }
    }
  } else if (payload && typeof payload === 'object') {
    const root = payload as Record<string, unknown>;
    const candidateArrays = [root.nodes, root.data, root.results];

    for (const candidate of candidateArrays) {
      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          if (item && typeof item === 'object') {
            inspectRecord(item as Record<string, unknown>);
          }
        }
      }
    }

    if (root.node && typeof root.node === 'object') {
      inspectRecord(root.node as Record<string, unknown>);
    }
  }

  return {
    nodeIds: toUniqueStrings(nodeIds),
    distressIds: toUniqueNumbers(distressIds),
  };
};

const discoverActiveDistressContext = async (): Promise<ActiveDistressContext> => {
  const candidates = ['/api/nodes', '/api/proxy/nodes', '/api/mesh/nodes'];

  for (const endpoint of candidates) {
    try {
      const res = await api.get<unknown>(endpoint);
      const context = extractActiveDistressContext(res.data);
      if (context.nodeIds.length > 0 || context.distressIds.length > 0) {
        return context;
      }
    } catch {
      // Best-effort discovery; continue to next endpoint.
    }
  }

  return {
    nodeIds: [],
    distressIds: [],
  };
};

const tryEtaEndpoints = async (endpoints: string[]): Promise<RouteFetchResult | null> => {
  let sawNoAssignment = false;

  for (const endpoint of endpoints) {
    try {
      const res = await api.get<{ eta_minutes?: unknown }>(endpoint);
      const etaMinutes = toEtaNumber(res.data?.eta_minutes);

      if (etaMinutes !== null) {
        return {
          status: 'available',
          data: buildEtaOnlyRouteResponse(etaMinutes),
          message: null,
        };
      }

      if (res.data && Object.prototype.hasOwnProperty.call(res.data, 'eta_minutes')) {
        sawNoAssignment = true;
        continue;
      }
    } catch {
      // Try next fallback endpoint.
    }
  }

  if (sawNoAssignment) {
    return {
      status: 'no-assignment',
      data: null,
      message: 'No active rescue route.',
    };
  }

  return null;
};

const callRouteEndpoint = async (
  client: ApiClient,
  endpoint: string
): Promise<RouteFetchResult> => {
  try {
    const res = await client.get<unknown>(endpoint);

    if (!hasRouteShape(res.data)) {
      return {
        status: 'unavailable',
        data: null,
        message: 'Live route response format is invalid.',
      };
    }

    return {
      status: 'available',
      data: res.data,
      message: null,
    };
  } catch (error: any) {
    const status = error?.response?.status as number | undefined;
    const payload = error?.response?.data;

    if (status === 404) {
      if (looksLikeNoAssignment(payload)) {
        return {
          status: 'no-assignment',
          data: null,
          message: normalizeNoRouteMessage(payload),
        };
      }

      return {
        status: 'unavailable',
        data: null,
        message: 'Live route endpoint is unavailable.',
      };
    }

    return {
      status: 'unavailable',
      data: null,
      message: normalizeUnavailableMessage(payload),
    };
  }
};

export const fetchRescuerLiveRoute = async (
  tileSource: TileSource
): Promise<RouteFetchResult> => {
  if (tileSource === 'none') {
    return {
      status: 'unavailable',
      data: null,
      message: 'No network source for live route.',
    };
  }

  if (tileSource === 'online') {
    return callRouteEndpoint(cloudApi, '/api/rescuer/route/live');
  }

  const localDirect = await callRouteEndpoint(api, '/api/rescuer/route/live');
  if (localDirect.status === 'available' || localDirect.status === 'no-assignment') {
    return localDirect;
  }

  // Fallback to mesh proxy forwarding when local route endpoint is not available.
  return callRouteEndpoint(api, '/api/proxy/rescuer/route/live');
};

export const fetchCivilianLiveRoute = async (
  connectedNodeId: string | null
): Promise<RouteFetchResult> => {
  let sawNoAssignment = false;

  const candidateEndpoints = [
    '/api/civilian/route/live',
    '/api/route/live/public',
    '/api/public/route/live',
    '/api/proxy/civilian/route/live',
    '/api/proxy/route/live/public',
    '/api/proxy/public/route/live',
    connectedNodeId ? `/api/node/${connectedNodeId}/route/live` : null,
    connectedNodeId ? `/api/proxy/node/${connectedNodeId}/route/live` : null,
  ].filter((endpoint): endpoint is string => Boolean(endpoint));

  for (const endpoint of candidateEndpoints) {
    const result = await callRouteEndpoint(api, endpoint);
    if (result.status === 'available') {
      return result;
    }
    if (result.status === 'no-assignment') {
      sawNoAssignment = true;
    }
  }

  const activeDistressContext = await discoverActiveDistressContext();

  // Prefer active-distress nodes first so civilian route does not depend on connected node.
  const activeNodeEtaEndpoints = activeDistressContext.nodeIds.flatMap(nodeId => [
    `/api/node/${nodeId}/distress/eta`,
    `/api/proxy/node/${nodeId}/distress/eta`,
  ]);
  const fromActiveNodeEta = await tryEtaEndpoints(activeNodeEtaEndpoints);
  if (fromActiveNodeEta) {
    if (fromActiveNodeEta.status === 'available') {
      return fromActiveNodeEta;
    }
    sawNoAssignment = sawNoAssignment || fromActiveNodeEta.status === 'no-assignment';
  }

  const distressEtaEndpoints = activeDistressContext.distressIds.flatMap(distressId => [
    `/api/distress/${distressId}/eta`,
    `/api/public/distress/${distressId}/eta`,
    `/api/proxy/distress/${distressId}/eta`,
  ]);
  const fromDistressEta = await tryEtaEndpoints(distressEtaEndpoints);
  if (fromDistressEta) {
    if (fromDistressEta.status === 'available') {
      return fromDistressEta;
    }
    sawNoAssignment = sawNoAssignment || fromDistressEta.status === 'no-assignment';
  }

  // Last fallback for legacy node-scoped ETA behavior.
  if (connectedNodeId) {
    const connectedNodeEtaEndpoints = [
      `/api/node/${connectedNodeId}/distress/eta`,
      `/api/proxy/node/${connectedNodeId}/distress/eta`,
    ];
    const fromConnectedNodeEta = await tryEtaEndpoints(connectedNodeEtaEndpoints);
    if (fromConnectedNodeEta) {
      if (fromConnectedNodeEta.status === 'available') {
        return fromConnectedNodeEta;
      }
      sawNoAssignment = sawNoAssignment || fromConnectedNodeEta.status === 'no-assignment';
    }
  }

  if (sawNoAssignment) {
    return {
      status: 'no-assignment',
      data: null,
      message: 'No active rescue route.',
    };
  }

  return {
    status: 'unavailable',
    data: null,
    message: 'Live route is unavailable on this mesh node.',
  };
};
