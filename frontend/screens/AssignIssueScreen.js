import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  assignIssueRequest,
  closeIssueRequest,
  updateIssueStatusRequest,
} from '../services/api';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved'];

export default function AssignIssueScreen({ route }) {
  const initialIssueId = route.params?.issueId ? String(route.params.issueId) : '';
  const [issueId, setIssueId] = useState(initialIssueId);
  const [workerId, setWorkerId] = useState('');
  const [status, setStatus] = useState('Pending');
  const [loadingAction, setLoadingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function requireIssueId() {
    if (!issueId.trim()) {
      setError('Issue id is required.');
      return null;
    }
    return issueId.trim();
  }

  async function runAction(actionName, fn) {
    const cleanIssueId = requireIssueId();
    if (!cleanIssueId) return;

    setLoadingAction(actionName);
    setMessage('');
    setError('');

    try {
      const result = await fn(cleanIssueId);
      const nextMessage = result.message || 'Action completed.';
      setMessage(nextMessage);
      Alert.alert('Success', nextMessage);
    } catch (e) {
      const nextError = e.message || 'Action failed.';
      setError(nextError);
      Alert.alert('Error', nextError);
    } finally {
      setLoadingAction('');
    }
  }

  function handleAssign() {
    if (!workerId.trim()) {
      setError('Worker id is required.');
      return;
    }

    runAction('assign', (cleanIssueId) =>
      assignIssueRequest(cleanIssueId, workerId.trim()),
    );
  }

  function handleStatusUpdate(nextStatus) {
    setStatus(nextStatus);
    runAction(`status-${nextStatus}`, (cleanIssueId) =>
      updateIssueStatusRequest(cleanIssueId, nextStatus),
    );
  }

  function handleClose() {
    runAction('close', closeIssueRequest);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Manage Issue</Text>
      <Text style={styles.subtitle}>Assign work, update status, or close a resolved issue.</Text>

      <Text style={styles.label}>Issue ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Issue id"
        value={issueId}
        onChangeText={setIssueId}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Worker ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Worker user id"
        value={workerId}
        onChangeText={setWorkerId}
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.primaryButton, loadingAction === 'assign' && styles.disabled]}
        onPress={handleAssign}
        disabled={Boolean(loadingAction)}
      >
        {loadingAction === 'assign' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Assign Issue</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Update Status</Text>
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.statusButton,
              status === option && styles.statusButtonActive,
              Boolean(loadingAction) && styles.disabled,
            ]}
            onPress={() => handleStatusUpdate(option)}
            disabled={Boolean(loadingAction)}
          >
            <Text
              style={[
                styles.statusButtonText,
                status === option && styles.statusButtonTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.closeButton, loadingAction === 'close' && styles.disabled]}
        onPress={handleClose}
        disabled={Boolean(loadingAction)}
      >
        {loadingAction === 'close' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.closeButtonText}>Close Resolved Issue</Text>
        )}
      </TouchableOpacity>

      {message ? <Text style={styles.successText}>{message}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F6F7FB',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    color: '#6B7280',
    lineHeight: 20,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    marginBottom: 14,
    fontSize: 16,
    color: '#111827',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#2d6cdf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  statusRow: {
    gap: 10,
  },
  statusButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonActive: {
    borderColor: '#2d6cdf',
    backgroundColor: '#E8F0FE',
  },
  statusButtonText: {
    color: '#374151',
    fontWeight: '700',
  },
  statusButtonTextActive: {
    color: '#2d6cdf',
  },
  closeButton: {
    marginTop: 24,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
  successText: {
    marginTop: 18,
    color: '#166534',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 18,
    color: '#991B1B',
    fontWeight: '700',
  },
});
