import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { clearSession, logoutRequest } from '../services/api';

export default function AdminDashboard({ navigation, onLogout }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutRequest();
    } catch {
      // Clear local session even if request fails
    } finally {
      await clearSession();
      onLogout();
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.body}>System administration and oversight.</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('UserManagement')}
      >
        <Text style={styles.primaryButtonText}>User Management</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f5f6fa' },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  body: { fontSize: 16, color: '#555', marginBottom: 24 },
  primaryButton: {
    backgroundColor: '#2d6cdf',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: 240,
    marginBottom: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  button: {
    backgroundColor: '#c0392b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: 200,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
