import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface RulesScreenProps {
  onBack?: () => void;
}

export default function CheatSheetScreen({ onBack }: RulesScreenProps) {
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
        <Text style={styles.headerTitle}>Cheat Sheet</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Quick reference tables for during gameplay.</Text>

        {/* Draw & Cancel Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🃏 Draw & Cancel Cards</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Card</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>Effect</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.8 }]}>Stack?</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.8 }]}>Cancel?</Text>
            </View>
            {[
              { card: '2', effect: 'Draw 2', stack: '✅', cancel: '✅' },
              { card: 'J♠/J♣', effect: 'Draw 5', stack: '✅', cancel: '✅' },
              { card: 'J♥/J♦', effect: 'Cancel all', stack: '—', cancel: '—' },
              { card: '8', effect: 'Skip', stack: '—', cancel: '❌' },
              { card: 'K', effect: 'Reverse', stack: '—', cancel: '❌' },
              { card: 'A', effect: 'Change suit', stack: '—', cancel: '❌' },
            ].map((row, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.cardCell, { flex: 1.2 }]}>{row.card}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{row.effect}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{row.stack}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{row.cancel}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Penalties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Penalties</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Infraction</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Penalty</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.8 }]}>Ends?</Text>
            </View>
            {[
              { infraction: 'Mistake (illegal play)', penalty: 'Draw 2', ends: '✅' },
              { infraction: 'Exposure (showed cards)', penalty: 'Draw 1', ends: '❌' },
              { infraction: 'Queen not covered', penalty: 'Draw 1', ends: '✅' },
              { infraction: 'Forgot "Last card!"', penalty: 'Draw 1', ends: '—' },
            ].map((row, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.infraction}</Text>
                <Text style={[styles.tableCell, styles.penaltyCell, { flex: 1 }]}>{row.penalty}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{row.ends}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Run Rules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Run Rules</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2.5 }]}>Rule</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>OK?</Text>
            </View>
            {[
              { rule: '±1 rank steps', allowed: '✅' },
              { rule: 'Same suit on ±1', allowed: '✅ Required' },
              { rule: 'Same-rank hops to change suit', allowed: '✅' },
              { rule: 'Ace wrap (K↔A↔2)', allowed: '✅ Once' },
              { rule: 'Queen after J/K same suit', allowed: '✅' },
              { rule: 'Direction change mid-run', allowed: '❌' },
              { rule: 'Double Ace wrap', allowed: '❌' },
            ].map((row, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 2.5 }]}>{row.rule}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{row.allowed}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Queen Pivot Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👑 Queen Pivot Examples</Text>
          <View style={styles.examplesContainer}>
            <View style={styles.exampleValid}>
              <Text style={styles.exampleLabel}>✅ Valid</Text>
              <Text style={styles.exampleCards}>J♠ → Q♠ → 10♦ → 9♦</Text>
            </View>
            <View style={styles.exampleInvalid}>
              <Text style={styles.exampleLabel}>❌ Invalid (wrong suit)</Text>
              <Text style={styles.exampleCards}>J♣ → Q♥ → 9♦</Text>
            </View>
            <View style={styles.exampleValid}>
              <Text style={styles.exampleLabel}>✅ Valid</Text>
              <Text style={styles.exampleCards}>J♥ → Q♥ → 6♣ → 6♦ → 7♦</Text>
            </View>
            <View style={styles.exampleValid}>
              <Text style={styles.exampleLabel}>✅ Valid</Text>
              <Text style={styles.exampleCards}>K♠ → Q♠ → any card</Text>
            </View>
          </View>
        </View>

        {/* Draw Pressure Stacking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Draw Stacking</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Sequence</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Total</Text>
            </View>
            {[
              { sequence: '2', total: '+2' },
              { sequence: '2 → 2', total: '+4' },
              { sequence: '2 → J♠', total: '+7' },
              { sequence: 'J♣ → J♠', total: '+10' },
              { sequence: '2 → 2 → 2', total: '+6' },
            ].map((row, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.sequence}</Text>
                <Text style={[styles.tableCell, styles.totalCell, { flex: 1 }]}>{row.total}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Quick Reminders</Text>
          <View style={styles.remindersCard}>
            <Text style={styles.reminderItem}>• Match by <Text style={styles.bold}>suit</Text> or <Text style={styles.bold}>rank</Text></Text>
            <Text style={styles.reminderItem}>• Queen on top = <Text style={styles.bold}>free start</Text> (play any card)</Text>
            <Text style={styles.reminderItem}>• Red Jack = <Text style={styles.bold}>shield</Text> (cancels draw, ends turn)</Text>
            <Text style={styles.reminderItem}>• Say <Text style={styles.bold}>"Last card!"</Text> when you have one left</Text>
            <Text style={styles.reminderItem}>• Can't start runs while under draw pressure</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
  },
  intro: {
    color: '#a0a0a0',
    fontSize: 14,
    marginTop: 15,
    fontStyle: 'italic',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  table: {
    backgroundColor: '#2a2a4e',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3a3a5e',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#ffd700',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: '#252545',
  },
  tableCell: {
    color: '#e0e0e0',
    fontSize: 13,
  },
  cardCell: {
    fontWeight: 'bold',
    color: '#fff',
  },
  penaltyCell: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  totalCell: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  examplesContainer: {
    gap: 8,
  },
  exampleValid: {
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  exampleInvalid: {
    backgroundColor: '#3a1a1a',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  exampleLabel: {
    color: '#a0a0a0',
    fontSize: 11,
    marginBottom: 4,
  },
  exampleCards: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  remindersCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
  },
  reminderItem: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 26,
  },
  bold: {
    fontWeight: 'bold',
    color: '#ffd700',
  },
  bottomSpacer: {
    height: 40,
  },
});
