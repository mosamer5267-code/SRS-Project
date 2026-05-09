import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getIssueDetailsRequest } from '../services/api';

function formatDateTime(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusStyle(status) {
  const cleanStatus = String(status || '').toLowerCase();

  if (cleanStatus.includes('progress')) {
    return styles.statusInProgress;
  }

  if (cleanStatus.includes('resolved') || cleanStatus.includes('closed')) {
    return styles.statusResolved;
  }

  return styles.statusPending;
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not specified'}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function IssueDetailsScreen({ route }) {
  const issueId = route.params?.issueId;

  const [issue, setIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadIssue(showFullLoader = true) {
    try {
      if (showFullLoader) {
        setIsLoading(true);
      }

      setErrorMessage('');

      const response = await getIssueDetailsRequest(issueId);
      setIssue(response.data);
    } catch (error) {
      setErrorMessage(error.message || 'Could not load issue details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadIssue(true);
    }, [issueId])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadIssue(false);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading issue details...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Could not load issue</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </SafeAreaView>
    );
  }

  if (!issue) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Issue not found</Text>
      </SafeAreaView>
    );
  }

  const photos = issue.photos || [];
  const comments = issue.comments || [];

  const mainPhoto =
    photos.find((photo) => photo.type === 'issue') ||
    photos.find((photo) => photo.type !== 'completion') ||
    photos[0];

  const completionPhotos = photos.filter(
    (photo) => photo.type === 'completion'
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.topCard}>
          <View style={styles.titleRow}>
            <View style={styles.titleBox}>
              <Text style={styles.category}>{issue.category || 'General'}</Text>
              <Text style={styles.title}>
                {issue.title || 'Campus Issue'}
              </Text>
            </View>

            <View style={[styles.statusBadge, getStatusStyle(issue.status)]}>
              <Text style={styles.statusText}>
                {issue.status || 'Pending'}
              </Text>
            </View>
          </View>

          {mainPhoto?.url || issue.photoUrl ? (
            <Image
              source={{ uri: mainPhoto?.url || issue.photoUrl }}
              style={styles.mainImage}
            />
          ) : (
            <View style={styles.noImageBox}>
              <Text style={styles.noImageText}>No issue photo available</Text>
            </View>
          )}
        </View>

        <Section title="Issue Information">
          <DetailRow label="Location" value={issue.location} />
          <DetailRow label="Category" value={issue.category} />
          <DetailRow label="Submitted At" value={formatDateTime(issue.createdAt)} />
          <DetailRow label="Last Updated" value={formatDateTime(issue.updatedAt)} />
          <DetailRow label="Resolved At" value={formatDateTime(issue.resolvedAt)} />
        </Section>

        <Section title="Description">
          <Text style={styles.paragraph}>
            {issue.description || 'No description was added for this issue.'}
          </Text>
        </Section>

        <Section title="Worker Comments">
          {comments.length === 0 ? (
            <Text style={styles.mutedText}>
              No comments have been added yet.
            </Text>
          ) : (
            comments.map((comment) => (
              <View key={String(comment.id)} style={styles.commentCard}>
                <Text style={styles.commentText}>{comment.text}</Text>
                <Text style={styles.commentDate}>
                  {formatDateTime(comment.createdAt)}
                </Text>
              </View>
            ))
          )}
        </Section>

        <Section title="Completion Photos">
          {completionPhotos.length === 0 ? (
            <Text style={styles.mutedText}>
              No completion photos uploaded yet.
            </Text>
          ) : (
            completionPhotos.map((photo) => (
              <Image
                key={String(photo.id)}
                source={{ uri: photo.url }}
                style={styles.completionImage}
              />
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBox: {
    flex: 1,
  },
  category: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusResolved: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  mainImage: {
    height: 220,
    width: '100%',
    borderRadius: 14,
    marginTop: 16,
    backgroundColor: '#E5E7EB',
  },
  noImageBox: {
    height: 180,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  paragraph: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
  },
  mutedText: {
    color: '#6B7280',
    fontSize: 14,
  },
  commentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  commentText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  commentDate: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 12,
  },
  completionImage: {
    height: 180,
    width: '100%',
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#E5E7EB',
  },
  centered: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    color: '#991B1B',
    textAlign: 'center',
  },
});