import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigations from './src/navigations/appNavigations';

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigations />
      </AuthProvider>
    </NavigationContainer>
  );
}