import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CommunityDashboard from '../screens/CommunityDashboard';
import ManagerDashboard from '../screens/ManagerDashboard';
import WorkerDashboard from '../screens/WorkerDashboard';
import AdminDashboard from '../screens/AdminDashboard';
import SubmitIssueScreen from '../screens/SubmitIssue/SubmitIssueScreen';
import MyIssuesScreen from '../screens/MyIssuesScreen';
import IssueDetailsScreen from '../screens/IssueDetailsScreen';
import AssignIssueScreen from "../screens/AssignIssueScreen";
import AssignedIssuesScreen from '../screens/AssignedIssuesScreen';
import IssueWorkScreen from '../screens/IssueWorkScreen';
import UserManagementScreen from '../screens/UserManagementScreen';

import { clearSession, getToken, getStoredUser, normalizeRole } from '../services/api';

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
          if (__DEV__) {
            console.log('[AppNavigator] restored session role:', stored.role);
          }
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
    const role = normalizeRole(user?.role);
    if (!role) {
      return null;
    }

    const screen = ROLE_TO_SCREEN[role] || null;
    if (__DEV__) {
      console.log('[AppNavigator] initial route for role', role, '→', screen);
    }
    return screen;
  }, [user]);

  async function handleInvalidSessionLogout() {
    await clearSession();
    setUser(null);
  }

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

  if (!mainInitialRoute) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Invalid account role</Text>
        <Text style={styles.errorText}>
          This account does not have a valid CampusCare role. Please sign in with a valid account.
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={handleInvalidSessionLogout}>
          <Text style={styles.errorButtonText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main app: role decides which dashboard is shown first
  const navigatorKey = `main-${user.id}-${normalizeRole(user.role) || 'unknown'}`;

  return (
    <Stack.Navigator
      key={navigatorKey}
      initialRouteName={mainInitialRoute}
      screenOptions={{ headerShown: true }}
    >
      <Stack.Screen name="CommunityDashboard" options={{ title: 'Community' }}>
        {(props) => (
          <CommunityDashboard {...props} onLogout={() => setUser(null)} />
        )}
      </Stack.Screen>
      <Stack.Screen name="SubmitIssue" options={{ title: 'Submit issue' }}>
        {(props) => <SubmitIssueScreen {...props} />}
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

      <Stack.Screen
        name="AssignedIssues"
        component={AssignedIssuesScreen}
        options={{ title: 'Assigned Issues' }}
      />

      <Stack.Screen
        name="IssueWork"
        component={IssueWorkScreen}
        options={{ title: 'Issue Work' }}
      />

      <Stack.Screen name="AdminDashboard" options={{ title: 'Admin' }}>
        {(props) => (
          <AdminDashboard
            {...props}
            onLogout={() => setUser(null)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'User Management' }}
      />

      <Stack.Screen
      name="AssignIssue"
      component={AssignIssueScreen}
      options={{ title: "Assign Issue" }}
      />
      
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 21,
  },
  errorButton: {
    backgroundColor: '#2d6cdf',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
