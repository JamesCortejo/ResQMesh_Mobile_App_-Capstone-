import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import RescuerMainChatScreen from '../Screens/RescuerScreens/mainChatScreen';
import RescuerMapScreen from '../Screens/RescuerScreens/mapScreen';
import RescuerAssignmentsScreen from '../Screens/RescuerScreens/assignmentsScreen';

export type RescuerMainTabParamList = {
  RescuerMainChat: undefined;
  RescuerMap: undefined;
  RescuerAssignments: undefined;
};

const Tab = createBottomTabNavigator<RescuerMainTabParamList>();

const RescuerMainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
    >
      <Tab.Screen name="RescuerMainChat" component={RescuerMainChatScreen} />
      <Tab.Screen name="RescuerMap" component={RescuerMapScreen} />
      <Tab.Screen name="RescuerAssignments" component={RescuerAssignmentsScreen} />
    </Tab.Navigator>
  );
};

export default RescuerMainTabs;