import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { clearSession, logoutRequest } from '../services/api';

export default function CommunityDashboard({ navigation, onLogout }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutRequest();
    } catch {
      // Still clear local session if server unreachable
    } finally {
      await clearSession();
      onLogout();
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community dashboard</Text>
      <Text style={styles.body}>Welcome — report and track campus issues here.</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('SubmitIssue')}
      >
        <Text style={styles.primaryButtonText}>Submit an issue</Text>
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
  body: { fontSize: 16, color: '#555', marginBottom: 16 },
  primaryButton: {
    backgroundColor: '#2d6cdf',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: 280,
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
