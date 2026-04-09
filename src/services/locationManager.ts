import * as Location from 'expo-location';
import cloudApi from './cloudApi';

let intervalId: number | null = null;
let lastSentTime = 0;
let currentUserId: number | null = null;

// Change this value to adjust update frequency (milliseconds)
const LOCATION_UPDATE_INTERVAL_MS = 10000; // 10 seconds

async function sendLocation(nodeId: string | null) {
  const now = Date.now();
  // Throttle: ensure at least INTERVAL_MS between actual HTTP calls
  if (now - lastSentTime < LOCATION_UPDATE_INTERVAL_MS) return;
  lastSentTime = now;

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    await cloudApi.post('/api/location/update', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      node_id: nodeId,
    });
  } catch (err) {
    console.error('Failed to send location', err);
  }
}

export async function startRescuerLocationTracking(userId: number, nodeId: string | null) {
  // Already tracking this user – do nothing
  if (intervalId && currentUserId === userId) return;

  // Stop any existing tracking
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Location permission denied');
    return;
  }

  currentUserId = userId;
  await sendLocation(nodeId);
  intervalId = setInterval(() => sendLocation(nodeId), LOCATION_UPDATE_INTERVAL_MS);
}

export function stopRescuerLocationTracking() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  currentUserId = null;
}