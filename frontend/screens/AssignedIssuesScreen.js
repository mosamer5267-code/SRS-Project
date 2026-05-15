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

import { getAssignedIssuesRequest } from '../services/api';

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
        <Text style={styles.status}>{issue.status || 'Pending'}</Text>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {issue.description || 'No description was added for this issue.'}
      </Text>
      <Text style={styles.location}>Location: {issue.location || 'Not specified'}</Text>
    </Pressable>
  );
}

export default function AssignedIssuesScreen({ navigation }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadIssues(showFullLoader = true) {
    try {
      if (showFullLoader) setLoading(true);
      setError('');
      const response = await getAssignedIssuesRequest();
      setIssues(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setError(e.message || 'Could not load assigned issues.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadIssues(true);
    }, []),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadIssues(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading assigned issues...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Assigned Issues</Text>
        <Text style={styles.screenSubtitle}>Work only on issues assigned to you.</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={issues.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            onPress={() => navigation.navigate('IssueWork', { issueId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No assigned issues</Text>
            <Text style={styles.emptyText}>Assigned work will appear here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  screenTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  screenSubtitle: { marginTop: 6, color: '#6B7280' },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitleBox: { flex: 1 },
  category: { fontSize: 12, color: '#2563EB', fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  status: { color: '#374151', fontWeight: '700' },
  description: { marginTop: 10, color: '#4B5563', lineHeight: 20 },
  location: { marginTop: 12, color: '#6B7280' },
  centered: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: '#6B7280' },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 14,
  },
  errorText: { color: '#991B1B', fontWeight: '700' },
  emptyBox: { alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  emptyText: { marginTop: 8, color: '#6B7280' },
});
