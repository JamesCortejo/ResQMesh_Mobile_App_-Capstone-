import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import SplashScreen from '../Screens/SplashScreen';
import WelcomeScreen from '../index';

// Civilian
import CivilianLoginScreen from '../Screens/CivilianScreens/civilianLoginScreen';
import CivilianRegisterScreen from '../Screens/CivilianScreens/civilianRegisterScreen';

// Rescuer
import RescuerLoginScreen from '../Screens/RescuerScreens/rescuerLoginScreen';
import RescuerMainTabs from './RescuerMainTabs';   // ✅ default import
import RescuerSettingsScreen from '../Screens/RescuerScreens/settingsScreen';

// Main tabs (civilian)
import MainTabs from './MainTabs';

// Drill‑down chat (shared)
import MeshNodeChatScreen from '../Screens/ChatScreens/meshNodeChatScreen';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  CivilianLogin: undefined;
  CivilianRegister: undefined;
  RescuerLogin: undefined;
  MainTabs: undefined;
  RescuerMainTabs: undefined;
  RescuerSettings: undefined;
  MeshNodeChat: { nodeId: string; nodeName: string; users: number };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigations = () => {
  return (
    <Stack.Navigator initialRouteName="Splash">
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CivilianLogin"
        component={CivilianLoginScreen}
        options={{
          title: 'Civilian Login',
          headerStyle: { backgroundColor: '#1e88e5' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="CivilianRegister"
        component={CivilianRegisterScreen}
        options={{
          title: 'Civilian Register',
          headerStyle: { backgroundColor: '#1e88e5' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="RescuerLogin"
        component={RescuerLoginScreen}
        options={{
          title: 'Rescuer Login',
          headerStyle: { backgroundColor: '#fb4f00' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RescuerMainTabs"
        component={RescuerMainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RescuerSettings"
        component={RescuerSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MeshNodeChat"
        component={MeshNodeChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigations;