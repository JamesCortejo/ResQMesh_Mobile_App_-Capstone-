import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import RescuerMainChatScreen from '../Screens/RescuerScreens/mainChatScreen';
import RescuerMapScreen from '../Screens/RescuerScreens/mapScreen';

export type RescuerMainTabParamList = {
  RescuerMainChat: undefined;
  RescuerMap: undefined;
};

const Tab = createBottomTabNavigator<RescuerMainTabParamList>();

const RescuerMainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // custom RescuerBottomNav
      }}
    >
      <Tab.Screen name="RescuerMainChat" component={RescuerMainChatScreen} />
      <Tab.Screen name="RescuerMap" component={RescuerMapScreen} />
    </Tab.Navigator>
  );
};

export default RescuerMainTabs;