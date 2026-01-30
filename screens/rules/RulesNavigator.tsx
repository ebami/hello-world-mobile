import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import QuickStartScreen from './QuickStartScreen';
import SpecialCardsScreen from './SpecialCardsScreen';
import RunsScreen from './RunsScreen';
import DrawPressureScreen from './DrawPressureScreen';
import PenaltiesScreen from './PenaltiesScreen';
import CheatSheetScreen from './CheatSheetScreen';

interface RulesNavigatorProps {
  onBack?: () => void;
}

type RulesSection = 
  | 'menu'
  | 'quick-start'
  | 'special-cards'
  | 'runs'
  | 'draw-pressure'
  | 'penalties'
  | 'cheat-sheet';

const menuItems = [
  {
    id: 'quick-start' as const,
    icon: '🚀',
    title: 'Quick Start',
    description: 'Learn the basics in 2 minutes',
  },
  {
    id: 'special-cards' as const,
    icon: '🃏',
    title: 'Special Cards',
    description: 'Card powers and effects',
  },
  {
    id: 'runs' as const,
    icon: '🔗',
    title: 'Runs',
    description: 'Play multiple cards in sequence',
  },
  {
    id: 'draw-pressure' as const,
    icon: '⚡',
    title: 'Draw Pressure',
    description: 'Stacking and shielding',
  },
  {
    id: 'penalties' as const,
    icon: '⚠️',
    title: 'Penalties & Winning',
    description: 'Rules violations and victory',
  },
  {
    id: 'cheat-sheet' as const,
    icon: '📋',
    title: 'Cheat Sheet',
    description: 'Quick reference tables',
  },
];

export default function RulesNavigator({ onBack }: RulesNavigatorProps) {
  const [currentSection, setCurrentSection] = useState<RulesSection>('menu');

  const handleNavigate = (section: string) => {
    setCurrentSection(section as RulesSection);
  };

  const handleBackToMenu = () => {
    setCurrentSection('menu');
  };

  // Render the appropriate screen based on current section
  switch (currentSection) {
    case 'quick-start':
      return <QuickStartScreen onBack={handleBackToMenu} onNavigate={handleNavigate} />;
    case 'special-cards':
      return <SpecialCardsScreen onBack={handleBackToMenu} />;
    case 'runs':
      return <RunsScreen onBack={handleBackToMenu} />;
    case 'draw-pressure':
      return <DrawPressureScreen onBack={handleBackToMenu} />;
    case 'penalties':
      return <PenaltiesScreen onBack={handleBackToMenu} />;
    case 'cheat-sheet':
      return <CheatSheetScreen onBack={handleBackToMenu} />;
    default:
      // Show the menu
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          
          {/* Header */}
          <View style={styles.header}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>How to Play</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View style={styles.hero}>
              <Text style={styles.heroEmoji}>🎴</Text>
              <Text style={styles.heroTitle}>Black Jack Black</Text>
              <Text style={styles.heroSubtitle}>A card-shedding game for 2–5 players</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuContainer}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => setCurrentSection(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Tip */}
            <View style={styles.tipSection}>
              <Text style={styles.tipTitle}>💡 New player?</Text>
              <Text style={styles.tipText}>
                Start with Quick Start to learn the basics, then explore other sections as you play!
              </Text>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#ffd700',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  heroEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  heroTitle: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#a0a0a0',
    fontSize: 16,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuItem: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
  },
  menuIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  menuDescription: {
    color: '#a0a0a0',
    fontSize: 13,
    marginTop: 3,
  },
  menuArrow: {
    color: '#ffd700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tipSection: {
    backgroundColor: '#1a3a4a',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
  },
  tipTitle: {
    color: '#ffd700',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tipText: {
    color: '#a0d0ff',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
