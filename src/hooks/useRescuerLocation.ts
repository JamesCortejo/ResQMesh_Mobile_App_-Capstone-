import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { startRescuerLocationTracking, stopRescuerLocationTracking } from '../services/locationManager';

export const useRescuerLocation = () => {
  const { user, nodeId } = useAuth();

  useEffect(() => {
    if (user?.role === 'rescuer' && user.id) {
      startRescuerLocationTracking(user.id, nodeId);
    } else {
      stopRescuerLocationTracking();
    }
  }, [user?.id, nodeId, user?.role]);
};