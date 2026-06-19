import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import RiderHomeScreen from '../screens/HomeScreen';
import BookRideScreen from '../screens/BookRideScreen';
import MatchingScreen from '../screens/MatchingScreen';
import TrackingScreen from '../screens/TrackingScreen';
import RatingScreen from '../screens/RatingScreen';
import RiderHistoryScreen from '../screens/HistoryScreen';
import RiderProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RiderHome" component={RiderHomeScreen} />
      <Stack.Screen name="BookRide" component={BookRideScreen} />
      <Stack.Screen name="Matching" component={MatchingScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
    </Stack.Navigator>
  );
}

const TabIcon = ({ emoji, label, focused }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    <Text style={{ fontSize: 10, color: focused ? colors.primary : colors.textMuted, fontWeight: focused ? '600' : '400' }}>{label}</Text>
  </View>
);

export default function RiderNavigator() {
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
        name="Home"
        component={HomeStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} /> }}
      />
      <Tab.Screen
        name="History"
        component={RiderHistoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="Trips" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={RiderProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}
