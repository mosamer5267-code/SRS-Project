import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  addIssueCommentRequest,
  getIssueDetailsRequest,
  updateIssueStatusRequest,
  uploadIssuePhotoRequest,
} from '../services/api';

export default function IssueWorkScreen({ route }) {
  const issueId = route.params?.issueId;
  const [issue, setIssue] = useState(null);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadIssue(showFullLoader = true) {
    if (!issueId) {
      setError('Missing issue id.');
      setLoading(false);
      return;
    }

    try {
      if (showFullLoader) setLoading(true);
      setError('');
      const response = await getIssueDetailsRequest(issueId);
      setIssue(response.data);
    } catch (e) {
      setError(e.message || 'Could not load issue.');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadIssue(true);
    }, [issueId]),
  );

  async function runAction(actionName, fn) {
    setAction(actionName);
    setMessage('');
    setError('');
    try {
      const result = await fn();
      const nextMessage = result.message || 'Action completed.';
      setMessage(nextMessage);
      Alert.alert('Success', nextMessage);
      await loadIssue(false);
    } catch (e) {
      const nextError = e.message || 'Action failed.';
      setError(nextError);
      Alert.alert('Error', nextError);
    } finally {
      setAction('');
    }
  }

  function handleMarkInProgress() {
    runAction('status', () => updateIssueStatusRequest(issueId, 'In Progress'));
  }

  function handleAddComment() {
    if (!comment.trim()) {
      setError('Comment text is required.');
      return;
    }
    runAction('comment', async () => {
      const result = await addIssueCommentRequest(issueId, comment.trim());
      setComment('');
      return result;
    });
  }

  function handleUploadPhoto() {
    if (!photoUrl.trim()) {
      setError('Photo URL is required.');
      return;
    }
    runAction('photo', async () => {
      const result = await uploadIssuePhotoRequest(issueId, photoUrl.trim());
      setPhotoUrl('');
      return result;
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading issue work...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.category}>{issue?.category || 'General'}</Text>
        <Text style={styles.title}>{issue?.title || 'Campus Issue'}</Text>
        <Text style={styles.status}>Status: {issue?.status || 'Pending'}</Text>
        <Text style={styles.location}>Location: {issue?.location || 'Not specified'}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.paragraph}>
            {issue?.description || 'No description was added for this issue.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, action === 'status' && styles.disabled]}
          onPress={handleMarkInProgress}
          disabled={Boolean(action)}
        >
          {action === 'status' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Mark In Progress</Text>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Comment</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Add a work note"
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.primaryButton, action === 'comment' && styles.disabled]}
            onPress={handleAddComment}
            disabled={Boolean(action)}
          >
            {action === 'comment' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Add Comment</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Photo</Text>
          <TextInput
            style={styles.input}
            placeholder="Completion photo URL"
            value={photoUrl}
            onChangeText={setPhotoUrl}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.secondaryButton, action === 'photo' && styles.disabled]}
            onPress={handleUploadPhoto}
            disabled={Boolean(action)}
          >
            {action === 'photo' ? (
              <ActivityIndicator color="#2d6cdf" />
            ) : (
              <Text style={styles.secondaryButtonText}>Submit Completion Photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { padding: 20, paddingBottom: 34 },
  category: { color: '#2563EB', fontWeight: '800', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  status: { marginTop: 10, color: '#374151', fontWeight: '700' },
  location: { marginTop: 4, marginBottom: 16, color: '#6B7280' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  paragraph: { color: '#374151', lineHeight: 21 },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    color: '#111827',
    marginBottom: 12,
  },
  multiline: { minHeight: 96, paddingTop: 12 },
  primaryButton: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#2d6cdf',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800' },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d6cdf',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#2d6cdf', fontWeight: '800' },
  disabled: { opacity: 0.7 },
  centered: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: '#6B7280' },
  successText: { color: '#166534', fontWeight: '800' },
  errorText: { color: '#991B1B', fontWeight: '800' },
});
