import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import AuthNavigator from '../auth/navigation/AuthNavigator';
import RiderNavigator from '../rider/navigation/RiderNavigator';
import DriverNavigator from '../driver/navigation/DriverNavigator';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === 'driver' ? (
          <Stack.Screen name="Driver" component={DriverNavigator} />
        ) : (
          <Stack.Screen name="Rider" component={RiderNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
