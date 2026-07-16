/**
 * Unit tests for StatsScreen component
 *
 * Tests the statistics display screen including:
 * - Rendering of UI elements
 * - Stats display from store
 * - Navigation and interactions
 * - Reset functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import StatsScreen, { formatLastPlayed } from '../../screens/StatsScreen';

// Mock the haptics module
jest.mock('../../utils/haptics', () => ({
  hapticButtonPress: jest.fn(),
}));

// Create mock store state factory
const createMockState = (overrides = {}) => ({
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  byDifficulty: {
    easy: { played: 0, wins: 0 },
    medium: { played: 0, wins: 0 },
    hard: { played: 0, wins: 0 },
  },
  currentWinStreak: 0,
  bestWinStreak: 0,
  totalCardsPlayed: 0,
  lastPlayed: null as string | null,
  getWinRate: jest.fn(() => 0),
  getDifficultyWinRate: jest.fn(() => 0),
  resetStats: jest.fn(),
  recordGameResult: jest.fn(),
  ...overrides,
});

let mockState = createMockState();

// Mock the stats store
jest.mock('../../stores/statsStore', () => ({
  useStatsStore: () => mockState,
}));

describe('StatsScreen', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to initial state before each test
    mockState = createMockState();
  });

  describe('Rendering', () => {
    it('renders the header with title', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('📊 Statistics')).toBeTruthy();
    });

    it('renders the back button', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('← Back')).toBeTruthy();
    });

    it('renders the win rate hero section', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Win Rate')).toBeTruthy();
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('renders games played stat', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Games Played')).toBeTruthy();
    });

    it('renders current streak stat', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Current Streak')).toBeTruthy();
    });

    it('renders best streak stat', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Best Streak')).toBeTruthy();
    });

    it('renders cards played stat', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Cards Played')).toBeTruthy();
    });

    it('renders difficulty breakdown section', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('By Difficulty')).toBeTruthy();
      expect(screen.getByText('Easy')).toBeTruthy();
      expect(screen.getByText('Medium')).toBeTruthy();
      expect(screen.getByText('Hard')).toBeTruthy();
    });

    it('renders last played section', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Last Played')).toBeTruthy();
      expect(screen.getByText('Never')).toBeTruthy();
    });

    it('does not render reset button when no games played', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.queryByText('Reset Statistics')).toBeNull();
    });
  });

  describe('Displaying Stats', () => {
    it('displays correct win rate with games played', () => {
      mockState = createMockState({
        gamesPlayed: 10,
        wins: 7,
        losses: 3,
        getWinRate: jest.fn(() => 70),
      });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('70%')).toBeTruthy();
      expect(screen.getByText('7 wins • 3 losses')).toBeTruthy();
    });

    it('displays correct stats values', () => {
      mockState = createMockState({
        gamesPlayed: 25,
        wins: 15,
        losses: 10,
        currentWinStreak: 3,
        bestWinStreak: 7,
        totalCardsPlayed: 150,
        getWinRate: jest.fn(() => 60),
      });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('25')).toBeTruthy(); // Games played
      expect(screen.getByText('3')).toBeTruthy(); // Current streak
      expect(screen.getByText('7')).toBeTruthy(); // Best streak
      expect(screen.getByText('150')).toBeTruthy(); // Cards played
    });

    it('displays difficulty breakdown stats', () => {
      mockState = createMockState({
        byDifficulty: {
          easy: { played: 5, wins: 4 },
          medium: { played: 10, wins: 5 },
          hard: { played: 3, wins: 1 },
        },
        getDifficultyWinRate: jest.fn((diff: string) => {
          if (diff === 'easy') return 80;
          if (diff === 'medium') return 50;
          if (diff === 'hard') return 33;
          return 0;
        }),
      });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('4/5 wins')).toBeTruthy();
      expect(screen.getByText('5/10 wins')).toBeTruthy();
      expect(screen.getByText('1/3 wins')).toBeTruthy();
    });

    it('shows dash for difficulty with no games', () => {
      mockState = createMockState({
        byDifficulty: {
          easy: { played: 0, wins: 0 },
          medium: { played: 5, wins: 3 },
          hard: { played: 0, wins: 0 },
        },
        getDifficultyWinRate: jest.fn(() => 0),
      });

      render(<StatsScreen onBack={mockOnBack} />);

      // Should show "-" for easy and hard which have 0 games
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it('shows reset button when games have been played', () => {
      mockState = createMockState({
        gamesPlayed: 5,
        wins: 3,
        losses: 2,
      });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Reset Statistics')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button is pressed', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      const backButton = screen.getByText('← Back');
      fireEvent.press(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset Functionality', () => {
    it('calls resetStats when reset button is pressed', () => {
      const mockResetStats = jest.fn();
      mockState = createMockState({
        gamesPlayed: 10,
        wins: 7,
        losses: 3,
        getWinRate: jest.fn(() => 70),
        resetStats: mockResetStats,
      });

      render(<StatsScreen onBack={mockOnBack} />);

      const resetButton = screen.getByText('Reset Statistics');
      fireEvent.press(resetButton);

      expect(mockResetStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Last Played Formatting', () => {
    it('shows "Never" when no games played', () => {
      mockState = createMockState({ lastPlayed: null });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Never')).toBeTruthy();
    });

    it('shows formatted date for old games', () => {
      // Set a date more than 7 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      mockState = createMockState({ lastPlayed: oldDate.toISOString() });

      render(<StatsScreen onBack={mockOnBack} />);

      // Should show the actual date in locale format
      expect(screen.getByText(oldDate.toLocaleDateString())).toBeTruthy();
    });

    it('shows "Yesterday" for a game played on the previous calendar day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mockState = createMockState({ lastPlayed: yesterday.toISOString() });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('Yesterday')).toBeTruthy();
    });

    it('shows "N days ago" for recent games', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      mockState = createMockState({ lastPlayed: fiveDaysAgo.toISOString() });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('5 days ago')).toBeTruthy();
    });
  });

  // Deterministic boundary tests for the pure formatter — `now` is injected so
  // there is no reliance on the wall clock or time of day (MFP-08).
  describe('formatLastPlayed (deterministic boundaries)', () => {
    it('returns "Never" for a null timestamp', () => {
      expect(formatLastPlayed(null, new Date(2026, 5, 15, 9, 0))).toBe('Never');
    });

    it('returns "Just now" within a minute', () => {
      const now = new Date(2026, 5, 15, 9, 0, 30);
      expect(formatLastPlayed(new Date(2026, 5, 15, 9, 0, 0).toISOString(), now)).toBe('Just now');
    });

    it('returns minutes/hours ago earlier the same calendar day', () => {
      const now = new Date(2026, 5, 15, 12, 0, 0);
      expect(formatLastPlayed(new Date(2026, 5, 15, 11, 30, 0).toISOString(), now)).toBe('30 minutes ago');
      expect(formatLastPlayed(new Date(2026, 5, 15, 9, 0, 0).toISOString(), now)).toBe('3 hours ago');
    });

    it('treats the previous calendar day as "Yesterday" regardless of time of day', () => {
      // Just after midnight: a game late "yesterday" is still "Yesterday" even
      // though only minutes of wall-clock elapsed (the old elapsed-hours bug).
      const earlyNow = new Date(2026, 5, 15, 0, 1, 0);
      expect(formatLastPlayed(new Date(2026, 5, 14, 23, 59, 0).toISOString(), earlyNow)).toBe('Yesterday');
      // Late in the day: a game early "yesterday" is also "Yesterday".
      const lateNow = new Date(2026, 5, 15, 23, 0, 0);
      expect(formatLastPlayed(new Date(2026, 5, 14, 1, 0, 0).toISOString(), lateNow)).toBe('Yesterday');
    });

    it('counts whole calendar days for "N days ago"', () => {
      const now = new Date(2026, 5, 15, 6, 0, 0);
      expect(formatLastPlayed(new Date(2026, 5, 10, 20, 0, 0).toISOString(), now)).toBe('5 days ago');
      expect(formatLastPlayed(new Date(2026, 5, 9, 20, 0, 0).toISOString(), now)).toBe('6 days ago');
    });

    it('falls back to a locale date at 7+ days', () => {
      const now = new Date(2026, 5, 15, 6, 0, 0);
      const old = new Date(2026, 5, 8, 20, 0, 0);
      expect(formatLastPlayed(old.toISOString(), now)).toBe(old.toLocaleDateString());
    });
  });

  describe('Haptic Feedback', () => {
    it('triggers haptic feedback on back button press', () => {
      const haptics = require('../../utils/haptics');
      render(<StatsScreen onBack={mockOnBack} />);

      const backButton = screen.getByText('← Back');
      fireEvent.press(backButton);

      expect(haptics.hapticButtonPress).toHaveBeenCalled();
    });

    it('triggers haptic feedback on reset button press', () => {
      const haptics = require('../../utils/haptics');
      mockState = createMockState({ gamesPlayed: 5 });

      render(<StatsScreen onBack={mockOnBack} />);

      const resetButton = screen.getByText('Reset Statistics');
      fireEvent.press(resetButton);

      expect(haptics.hapticButtonPress).toHaveBeenCalled();
    });
  });

  describe('Win/Loss Display', () => {
    it('displays zero wins and losses for new player', () => {
      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('0 wins • 0 losses')).toBeTruthy();
    });

    it('displays correct win/loss count', () => {
      mockState = createMockState({
        wins: 15,
        losses: 5,
        gamesPlayed: 20,
        getWinRate: jest.fn(() => 75),
      });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('15 wins • 5 losses')).toBeTruthy();
    });
  });

  describe('Difficulty Win Rates', () => {
    it('displays win rate percentage for each difficulty', () => {
      mockState = createMockState({
        byDifficulty: {
          easy: { played: 10, wins: 8 },
          medium: { played: 10, wins: 5 },
          hard: { played: 10, wins: 2 },
        },
        getDifficultyWinRate: jest.fn((diff: string) => {
          if (diff === 'easy') return 80;
          if (diff === 'medium') return 50;
          if (diff === 'hard') return 20;
          return 0;
        }),
      });

      render(<StatsScreen onBack={mockOnBack} />);

      expect(screen.getByText('80%')).toBeTruthy();
      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.getByText('20%')).toBeTruthy();
    });
  });
});
