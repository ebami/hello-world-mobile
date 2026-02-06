/**
 * @fileoverview Player statistics display screen.
 *
 * Shows game statistics including win rate, games played by difficulty,
 * win streaks, and total cards played.
 *
 * @module screens/StatsScreen
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStatsStore } from '../stores/statsStore';
import { hapticButtonPress } from '../utils/haptics';

interface StatsScreenProps {
  readonly onBack: () => void;
}

/**
 * Format a date string to a readable format.
 */
function formatLastPlayed(isoString: string | null): string {
  if (!isoString) return 'Never';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

/**
 * Stat card component for displaying individual statistics.
 */
function StatCard({
  title,
  value,
  subtitle,
  color = '#ffd700',
}: {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle?: string;
  readonly color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

/**
 * Difficulty row component for stats breakdown.
 */
function DifficultyRow({
  difficulty,
  played,
  wins,
  winRate,
}: {
  readonly difficulty: string;
  readonly played: number;
  readonly wins: number;
  readonly winRate: number;
}) {
  const difficultyColors: Record<string, string> = {
    Easy: '#4ade80',
    Medium: '#fbbf24',
    Hard: '#f87171',
  };

  return (
    <View style={styles.difficultyRow}>
      <View style={styles.difficultyInfo}>
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: difficultyColors[difficulty] || '#666' },
          ]}
        >
          <Text style={styles.difficultyBadgeText}>{difficulty}</Text>
        </View>
      </View>
      <View style={styles.difficultyStats}>
        <Text style={styles.difficultyStatText}>
          {wins}/{played} wins
        </Text>
        <Text style={styles.difficultyWinRate}>
          {played > 0 ? `${winRate}%` : '-'}
        </Text>
      </View>
    </View>
  );
}

export default function StatsScreen({ onBack }: StatsScreenProps) {
  const {
    gamesPlayed,
    wins,
    losses,
    byDifficulty,
    currentWinStreak,
    bestWinStreak,
    totalCardsPlayed,
    lastPlayed,
    getWinRate,
    getDifficultyWinRate,
    resetStats,
  } = useStatsStore();

  const winRate = getWinRate();

  const handleBack = () => {
    hapticButtonPress();
    onBack();
  };

  const handleResetStats = () => {
    hapticButtonPress();
    // Could add confirmation dialog here
    resetStats();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Statistics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Win Rate Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Win Rate</Text>
          <Text style={styles.heroValue}>{winRate}%</Text>
          <Text style={styles.heroSubtitle}>
            {wins} wins • {losses} losses
          </Text>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Games Played"
            value={gamesPlayed}
          />
          <StatCard
            title="Current Streak"
            value={currentWinStreak}
            subtitle="wins"
            color="#4ade80"
          />
          <StatCard
            title="Best Streak"
            value={bestWinStreak}
            subtitle="wins"
            color="#60a5fa"
          />
          <StatCard
            title="Cards Played"
            value={totalCardsPlayed}
          />
        </View>

        {/* Difficulty Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Difficulty</Text>
          <View style={styles.difficultyContainer}>
            <DifficultyRow
              difficulty="Easy"
              played={byDifficulty.easy.played}
              wins={byDifficulty.easy.wins}
              winRate={getDifficultyWinRate('easy')}
            />
            <DifficultyRow
              difficulty="Medium"
              played={byDifficulty.medium.played}
              wins={byDifficulty.medium.wins}
              winRate={getDifficultyWinRate('medium')}
            />
            <DifficultyRow
              difficulty="Hard"
              played={byDifficulty.hard.played}
              wins={byDifficulty.hard.wins}
              winRate={getDifficultyWinRate('hard')}
            />
          </View>
        </View>

        {/* Last Played */}
        <View style={styles.lastPlayedContainer}>
          <Text style={styles.lastPlayedLabel}>Last Played</Text>
          <Text style={styles.lastPlayedValue}>
            {formatLastPlayed(lastPlayed)}
          </Text>
        </View>

        {/* Reset Button */}
        {gamesPlayed > 0 && (
          <View>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetStats}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Reset Statistics</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  heroLabel: {
    color: '#a0a0a0',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroValue: {
    color: '#ffd700',
    fontSize: 72,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  statTitle: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statSubtitle: {
    color: '#666',
    fontSize: 12,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  difficultyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  difficultyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  difficultyBadgeText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  difficultyStats: {
    alignItems: 'flex-end',
  },
  difficultyStatText: {
    color: '#fff',
    fontSize: 14,
  },
  difficultyWinRate: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  lastPlayedContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  lastPlayedLabel: {
    color: '#666',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lastPlayedValue: {
    color: '#888',
    fontSize: 16,
    marginTop: 5,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: '#e63946',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#e63946',
    fontSize: 14,
    fontWeight: '600',
  },
});
