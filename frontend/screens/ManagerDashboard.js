import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  clearSession,
  getIssuesRequest,
  logoutRequest,
} from '../services/api';

const STATUS_OPTIONS = ['all', 'Pending', 'In Progress', 'Resolved'];
const SORT_OPTIONS = [
  { label: 'Date', value: 'date' },
  { label: 'Status', value: 'status' },
  { label: 'Category', value: 'category' },
];

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

function SummaryTile({ label, value }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, selected, onPress }) {
  return (
    <Pressable
      style={[styles.filterChip, selected && styles.filterChipSelected]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
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
          Reported: {formatDate(issue.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ManagerDashboard({ navigation, onLogout }) {
  const [issues, setIssues] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  async function loadIssues(showFullLoader = true) {
    try {
      if (showFullLoader) {
        setIsLoading(true);
      }

      setErrorMessage('');

      const response = await getIssuesRequest({
        status: statusFilter,
        category: categoryFilter,
        search: debouncedSearch,
        sortBy,
        sortOrder,
      });

      setIssues(response.data || []);
    } catch (error) {
      setErrorMessage(error.message || 'Could not load issues.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadIssues(true);
  }, [statusFilter, categoryFilter, debouncedSearch, sortBy, sortOrder]);

  const summary = useMemo(() => {
    return issues.reduce(
      (totals, issue) => {
        const status = String(issue.status || 'Pending').toLowerCase();

        totals.total += 1;

        if (status.includes('progress')) {
          totals.inProgress += 1;
        } else if (status.includes('resolved') || status.includes('closed')) {
          totals.resolved += 1;
        } else {
          totals.pending += 1;
        }

        return totals;
      },
      { total: 0, pending: 0, inProgress: 0, resolved: 0 }
    );
  }, [issues]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadIssues(false);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutRequest();
    } catch {
      // Clear local session even if request fails
    } finally {
      await clearSession();
      onLogout();
      setIsLoggingOut(false);
    }
  }

  function clearFilters() {
    setSearchText('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setCategoryFilter('');
    setSortBy('date');
    setSortOrder('DESC');
  }

  function openIssueDetails(issue) {
    navigation.navigate('IssueDetails', {
      issueId: issue.id,
      title: issue.title,
    });
  }

  function renderHeader() {
    return (
      <View>
        <View style={styles.header}>
          <View style={styles.headerTextBox}>
            <Text style={styles.screenTitle}>Facility Manager</Text>
            <Text style={styles.screenSubtitle}>
              Review, search, and sort all reported campus issues.
            </Text>
          </View>

          <Pressable
            style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.logoutText}>Log out</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <SummaryTile label="Total" value={summary.total} />
          <SummaryTile label="Pending" value={summary.pending} />
          <SummaryTile label="In progress" value={summary.inProgress} />
          <SummaryTile label="Resolved" value={summary.resolved} />
        </View>

        <View style={styles.filtersPanel}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by title, location, category, or issue number"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
          />

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((status) => (
                <FilterChip
                  key={status}
                  label={status === 'all' ? 'All' : status}
                  selected={statusFilter === status}
                  onPress={() => setStatusFilter(status)}
                />
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Category</Text>
            <TextInput
              style={styles.compactInput}
              value={categoryFilter}
              onChangeText={setCategoryFilter}
              placeholder="All categories"
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort by</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  selected={sortBy === option.value}
                  onPress={() => setSortBy(option.value)}
                />
              ))}

              <FilterChip
                label={sortOrder === 'DESC' ? 'Newest first' : 'Oldest first'}
                selected
                onPress={() =>
                  setSortOrder((current) =>
                    current === 'DESC' ? 'ASC' : 'DESC'
                  )
                }
              />
            </View>
          </View>

          <Pressable style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear filters</Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadIssues(true)}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
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
          isLoading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading issues...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No matching issues</Text>
              <Text style={styles.emptyText}>
                Adjust the filters to review more reported campus issues.
              </Text>
            </View>
          )
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
    fontSize: 28,
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
    minHeight: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },
  filtersPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
  },
  searchInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#111827',
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  compactInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#111827',
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  filterSection: {
    marginTop: 14,
  },
  filterLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  filterChipSelected: {
    borderColor: '#1D4ED8',
    backgroundColor: '#DBEAFE',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  filterChipTextSelected: {
    color: '#1E3A8A',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    marginBottom: 14,
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
  emptyBox: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
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
