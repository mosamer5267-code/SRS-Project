import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  getAdminUsersRequest,
  updateAdminUserStatusRequest,
} from '../services/api';

function UserRow({ user, statusSupported, onToggle }) {
  const status = user.status || 'not supported';
  const nextStatus = status === 'active' ? 'inactive' : 'active';

  return (
    <View style={styles.card}>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.meta}>Role: {user.role || 'unknown'}</Text>
      <Text style={styles.meta}>Status: {status}</Text>

      {statusSupported ? (
        <Pressable style={styles.statusButton} onPress={() => onToggle(user, nextStatus)}>
          <Text style={styles.statusButtonText}>
            Set {nextStatus}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [statusSupported, setStatusSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadUsers(showFullLoader = true) {
    try {
      if (showFullLoader) setLoading(true);
      setError('');
      const response = await getAdminUsersRequest();
      setUsers(Array.isArray(response.users) ? response.users : []);
      setStatusSupported(Boolean(response.statusSupported));
    } catch (e) {
      setError(e.message || 'Could not load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadUsers(true);
    }, []),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadUsers(false);
  }

  async function handleToggle(user, nextStatus) {
    setUpdatingId(user.id);
    setError('');
    setMessage('');

    try {
      await updateAdminUserStatusRequest(user.id, nextStatus);
      setMessage('User status updated.');
      await loadUsers(false);
    } catch (e) {
      setError(e.message || 'Could not update user status.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>
          Registered users and roles.
        </Text>
      </View>

      {!statusSupported ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Active/inactive status is not supported by the current users table.
          </Text>
        </View>
      ) : null}

      {message ? <Text style={styles.successText}>{message}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={users.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <View style={updatingId === item.id && styles.updating}>
            <UserRow
              user={item}
              statusSupported={statusSupported}
              onToggle={handleToggle}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No users found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6B7280' },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  email: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { marginTop: 6, color: '#4B5563' },
  statusButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#2d6cdf',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusButtonText: { color: '#FFFFFF', fontWeight: '800' },
  infoBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#E8F0FE',
    borderRadius: 10,
    padding: 14,
  },
  infoText: { color: '#1E3A8A', lineHeight: 20 },
  successText: {
    marginHorizontal: 16,
    marginBottom: 10,
    color: '#166534',
    fontWeight: '700',
  },
  errorText: {
    marginHorizontal: 16,
    marginBottom: 10,
    color: '#991B1B',
    fontWeight: '700',
  },
  updating: { opacity: 0.6 },
  centered: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: '#6B7280' },
  emptyBox: { alignItems: 'center' },
  emptyText: { color: '#6B7280', fontWeight: '700' },
});
