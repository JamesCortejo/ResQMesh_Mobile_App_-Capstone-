import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/appNavigations';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'Splash'>;
}

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Navigate based on role
        if (user.role === 'rescuer') {
          navigation.replace('RescuerMainTabs');
        } else {
          navigation.replace('MainTabs');
        }
      } else {
        navigation.replace('Welcome');
      }
    }
  }, [loading, user, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1e88e5" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default SplashScreen;