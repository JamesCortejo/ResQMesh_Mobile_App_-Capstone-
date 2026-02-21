// src/hooks/useRootNavigation.ts
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/appNavigations';

export const useRootNavigation = () => {
  const navigation = useNavigation();
  // Get the parent stack navigator (our root)
  const root = navigation.getParent();
  return root as StackNavigationProp<RootStackParamList>;
};