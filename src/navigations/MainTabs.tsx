import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MainChatScreen from '../Screens/MainAppScreens/mainChatScreen';
import DistressSignalScreen from '../Screens/MainAppScreens/distressSignalScreen';
import MapScreen from '../Screens/MainAppScreens/mapScreen';
import SettingsScreen from '../Screens/MainAppScreens/settingsScreen';

export type MainTabParamList = {
  MainChat: undefined;
  DistressSignal: undefined;
  Map: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // using custom BottomNav
      }}
    >
      <Tab.Screen name="MainChat" component={MainChatScreen} />
      <Tab.Screen name="DistressSignal" component={DistressSignalScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;