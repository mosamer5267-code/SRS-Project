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

import { getMyIssuesRequest } from '../services/api';

function formatDate(value) {
  if (!value) return 'No date';

  const date = new Date(value);

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

function IssueCard({ issue, onPress }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBox}>
          <Text style={styles.category}>{issue.category || 'General'}</Text>

          <Text style={styles.title} numberOfLines={1}>
            {issue.title || 'Campus Issue'}
          </Text>
        </View>

        <View style={[styles.statusBadge, getStatusStyle(issue.status)]}>
          <Text style={styles.statusText}>{issue.status || 'Pending'}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {issue.description || 'No description was added for this issue.'}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Location: {issue.location || 'Not specified'}
        </Text>

        <Text style={styles.footerText}>
          Submitted: {formatDate(issue.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MyIssuesScreen({ navigation }) {
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadIssues(showFullLoader = true) {
    try {
      if (showFullLoader) {
        setIsLoading(true);
      }

      setErrorMessage('');

      const response = await getMyIssuesRequest();
      setIssues(response.data || []);
    } catch (error) {
      setErrorMessage(error.message || 'Could not load your issues.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadIssues(true);
    }, [])
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadIssues(false);
  }

  function openIssueDetails(issue) {
    navigation.navigate('IssueDetails', {
      issueId: issue.id,
      title: issue.title,
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your issues...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Issues</Text>
        <Text style={styles.screenSubtitle}>
          Track the campus issues you submitted.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>

          <Pressable style={styles.retryButton} onPress={() => loadIssues(true)}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={
          issues.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <IssueCard issue={item} onPress={() => openIssueDetails(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No issues yet</Text>
            <Text style={styles.emptyText}>
              Once you submit a campus issue, it will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  screenSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  list: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleBox: {
    flex: 1,
  },
  category: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 10,
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
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
  centered: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 14,
  },
  errorText: {
    color: '#991B1B',
    marginBottom: 10,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991B1B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyList: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6B7280',
    lineHeight: 20,
  },
});