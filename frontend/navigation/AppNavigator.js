import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CommunityDashboard from '../screens/CommunityDashboard';
import ManagerDashboard from '../screens/ManagerDashboard';
import WorkerDashboard from '../screens/WorkerDashboard';
import AdminDashboard from '../screens/AdminDashboard';
import MyIssuesScreen from '../screens/MyIssuesScreen';
import IssueDetailsScreen from '../screens/IssueDetailsScreen';

import { getToken, getStoredUser } from '../services/api';

const Stack = createNativeStackNavigator();

/** Maps API role values to dashboard screen names */
const ROLE_TO_SCREEN = {
  community_member: 'CommunityDashboard',
  facility_manager: 'ManagerDashboard',
  worker: 'WorkerDashboard',
  admin: 'AdminDashboard',
};

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUserSession() {
      try {
        const token = await getToken();
        const stored = await getStoredUser();

        if (!cancelled && token && stored && stored.role) {
          setUser(stored);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    loadUserSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const mainInitialRoute = useMemo(() => {
    if (!user?.role) {
      return 'CommunityDashboard';
    }

    return ROLE_TO_SCREEN[user.role] || 'CommunityDashboard';
  }, [user]);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6cdf" />
      </View>
    );
  }

  // Auth stack: login / register
  if (!user) {
    return (
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: true }}
      >
        <Stack.Screen name="Login" options={{ title: 'Sign in' }}>
          {(props) => <LoginScreen {...props} onAuthSuccess={setUser} />}
        </Stack.Screen>

        <Stack.Screen name="Register" options={{ title: 'Register' }}>
          {(props) => <RegisterScreen {...props} onAuthSuccess={setUser} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // Main app: role decides which dashboard is shown first
  return (
    <Stack.Navigator
      initialRouteName={mainInitialRoute}
      screenOptions={{ headerShown: true }}
    >
      <Stack.Screen name="CommunityDashboard" options={{ title: 'Community' }}>
        {(props) => (
          <CommunityDashboard
            {...props}
            onLogout={() => setUser(null)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="MyIssues"
        component={MyIssuesScreen}
        options={{ title: 'My Issues' }}
      />

      <Stack.Screen
        name="IssueDetails"
        component={IssueDetailsScreen}
        options={{ title: 'Issue Details' }}
      />

      <Stack.Screen name="ManagerDashboard" options={{ title: 'Manager' }}>
        {(props) => (
          <ManagerDashboard
            {...props}
            onLogout={() => setUser(null)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="WorkerDashboard" options={{ title: 'Worker' }}>
        {(props) => (
          <WorkerDashboard
            {...props}
            onLogout={() => setUser(null)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="AdminDashboard" options={{ title: 'Admin' }}>
        {(props) => (
          <AdminDashboard
            {...props}
            onLogout={() => setUser(null)}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
});