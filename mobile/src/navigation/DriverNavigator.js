import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import colors from '../theme/colors';

import DriverHomeScreen from '../screens/driver/HomeScreen';
import OnboardingScreen from '../screens/driver/OnboardingScreen';
import ActiveRideScreen from '../screens/driver/ActiveRideScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import SubscriptionScreen from '../screens/driver/SubscriptionScreen';
import DriverProfileScreen from '../screens/driver/ProfileScreen';
import RideRequestScreen from '../screens/driver/RideRequestScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = {
    Home: focused ? '🟢' : '⚫',
    Earnings: focused ? '💵' : '💴',
    Subscription: focused ? '⭐' : '☆',
    Profile: focused ? '👤' : '👥',
  };
  return <Text style={{ fontSize: 20 }}>{icons[label] || '●'}</Text>;
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={DriverHomeScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Subscription" component={SubscriptionScreen} />
      <Tab.Screen name="Profile" component={DriverProfileScreen} />
    </Tab.Navigator>
  );
}

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverTabs" component={DriverTabs} />
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen
        name="RideRequest"
        component={RideRequestScreen}
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
    </Stack.Navigator>
  );
}
