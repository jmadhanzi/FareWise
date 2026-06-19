import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import DriverHomeScreen from '../screens/HomeScreen';
import ActiveRideScreen from '../screens/ActiveRideScreen';
import DriverEarningsScreen from '../screens/EarningsScreen';
import DriverSubscriptionScreen from '../screens/SubscriptionScreen';
import DriverProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverMain" component={DriverHomeScreen} />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
    </Stack.Navigator>
  );
}

const TabIcon = ({ emoji, label, focused }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    <Text style={{ fontSize: 10, color: focused ? colors.driverPrimary : colors.textMuted, fontWeight: focused ? '600' : '400' }}>{label}</Text>
  </View>
);

export default function DriverNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#161B22',
          borderTopColor: '#30363D',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12
        },
        tabBarShowLabel: false
      }}
    >
      <Tab.Screen
        name="Drive"
        component={HomeStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🚗" label="Drive" focused={focused} /> }}
      />
      <Tab.Screen
        name="Earnings"
        component={DriverEarningsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💰" label="Earnings" focused={focused} /> }}
      />
      <Tab.Screen
        name="Subscription"
        component={DriverSubscriptionScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" label="Plan" focused={focused} /> }}
      />
      <Tab.Screen
        name="DriverProfile"
        component={DriverProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
