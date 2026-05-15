import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  clearSession,
  getIssuesRequest,
  logoutRequest,
} from '../services/api';

function formatDate(value) {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusStyle(status) {
  const cleanStatus = String(status || '').toLowerCase();

  if (cleanStatus.includes('progress')) return styles.statusInProgress;
  if (cleanStatus.includes('resolved')) return styles.statusResolved;

  return styles.statusPending;
}

function IssueCard({ issue, onOpen, onManage }) {
  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBox}>
          <Text style={styles.category}>{issue.category || 'General'}</Text>
          <Text style={styles.issueTitle} numberOfLines={1}>
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
        <Text style={styles.footerText}>Location: {issue.location || 'Not specified'}</Text>
        <Text style={styles.footerText}>Reported: {formatDate(issue.createdAt)}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryAction} onPress={onOpen}>
          <Text style={styles.secondaryActionText}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryAction} onPress={onManage}>
          <Text style={styles.primaryActionText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

export default function ManagerDashboard({ navigation, onLogout }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  const counts = useMemo(() => {
    return issues.reduce(
      (acc, issue) => {
        const status = String(issue.status || 'Pending').toLowerCase();
        acc.total += 1;
        if (status.includes('progress')) acc.inProgress += 1;
        else if (status.includes('resolved')) acc.resolved += 1;
        else acc.pending += 1;
        return acc;
      },
      { total: 0, pending: 0, inProgress: 0, resolved: 0 },
    );
  }, [issues]);

  const loadIssues = useCallback(async ({ showSpinner = false } = {}) => {
    if (showSpinner) setLoading(true);
    setError('');

    try {
      const data = await getIssuesRequest();
      setIssues(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setError(e.message || 'Could not load issues.');
    } finally {
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIssues({ showSpinner: true });
  }, [loadIssues]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadIssues();
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutRequest();
    } catch {
      // Local logout should still succeed if the API is unreachable.
    } finally {
      await clearSession();
      onLogout();
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6cdf" />
        <Text style={styles.loadingText}>Loading submitted issues...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={issues.length ? styles.list : styles.emptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerTextBox}>
                <Text style={styles.screenTitle}>Facility manager dashboard</Text>
                <Text style={styles.screenSubtitle}>
                  Review all submitted campus issues.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.logoutButton, loggingOut && styles.buttonDisabled]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.logoutText}>Log out</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>{counts.total}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>{counts.pending}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>{counts.inProgress}</Text>
                <Text style={styles.summaryLabel}>In progress</Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>{counts.resolved}</Text>
                <Text style={styles.summaryLabel}>Resolved</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => loadIssues({ showSpinner: true })}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No submitted issues yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            onOpen={() => navigation.navigate('IssueDetails', { issueId: item.id })}
            onManage={() => navigation.navigate('AssignIssue', { issueId: item.id })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  list: {
    padding: 16,
    paddingBottom: 28,
  },
  emptyList: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    paddingBottom: 14,
  },
  headerTextBox: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  screenSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  logoutButton: {
    minWidth: 82,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryTile: {
    flex: 1,
    minHeight: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 11,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
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
  issueTitle: {
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#2d6cdf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d6cdf',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: '#2d6cdf',
    fontWeight: '700',
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
    marginBottom: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
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
  emptyBox: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontWeight: '600',
  },
});
