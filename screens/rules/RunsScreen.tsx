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

export default function RunsScreen({ onBack }: RulesScreenProps) {
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
        <Text style={styles.headerTitle}>Runs</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          A <Text style={styles.bold}>run</Text> is when you play multiple cards in sequence on a single turn.
        </Text>

        {/* Basic Run Rules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Basic Run Rules</Text>
          <View style={styles.rulesList}>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>1</Text>
              <Text style={styles.ruleText}>First card must still match the discard (suit or rank)</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>2</Text>
              <Text style={styles.ruleText}>Move ±1 rank per step (e.g., 9→10→J)</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>3</Text>
              <Text style={styles.ruleText}>Stay in the same suit for ±1 steps</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleNumber}>4</Text>
              <Text style={styles.ruleText}>Pick a direction and stick with it</Text>
            </View>
          </View>
          
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>✅ Valid Run</Text>
            <Text style={styles.exampleCards}>7♣ → 8♣ → 9♣ → 10♣</Text>
          </View>
        </View>

        {/* Changing Suit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Changing Suit (Same-Rank Hop)</Text>
          <Text style={styles.paragraph}>
            To switch suits, play <Text style={styles.bold}>one or more cards of the same rank</Text>:
          </Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>✅ Valid Suit Change</Text>
            <Text style={styles.exampleCards}>6♣ → 6♦ → 6♥ → 7♥</Text>
          </View>
          <Text style={styles.note}>After hopping, continue ±1 in the new suit.</Text>
        </View>

        {/* Ace Wrap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔁 Ace Wrap</Text>
          <Text style={styles.paragraph}>
            The <Text style={styles.bold}>Ace bridges King and 2</Text> — but only{' '}
            <Text style={styles.bold}>once per run</Text>.
          </Text>
          
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>✅ Valid Wrap</Text>
            <Text style={styles.exampleCards}>Q♠ → K♠ → A♠ → 2♠ → 3♠</Text>
          </View>
          
          <View style={styles.exampleBoxInvalid}>
            <Text style={styles.exampleLabel}>❌ Invalid (Second Wrap)</Text>
            <Text style={styles.exampleCards}>…K→A→2→3→ A →…</Text>
          </View>
        </View>

        {/* Queen Pivot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👑 Queen in Runs (Pivot Rule)</Text>
          <Text style={styles.paragraph}>
            Queen can only appear in a run <Text style={styles.bold}>immediately after J or K of the same suit</Text>.
          </Text>
          
          <View style={styles.pivotOptions}>
            <Text style={styles.pivotTitle}>After playing a Queen, you must:</Text>
            <Text style={styles.pivotOption}>
              ▶️ <Text style={styles.bold}>Cover it</Text> with any card (then continue the run)
            </Text>
            <Text style={styles.pivotOr}>— OR —</Text>
            <Text style={styles.pivotOption}>
              ▶️ <Text style={styles.bold}>Don't cover</Text> → Draw 1, turn ends, Queen stays on top
            </Text>
          </View>

          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>✅ Valid Pivot</Text>
            <Text style={styles.exampleCards}>J♠ → Q♠ → 10♦ → 9♦</Text>
          </View>

          <View style={styles.exampleBoxInvalid}>
            <Text style={styles.exampleLabel}>❌ Invalid (Wrong Suit)</Text>
            <Text style={styles.exampleCards}>J♣ → Q♥</Text>
          </View>

          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>✅ Pivot with Hops</Text>
            <Text style={styles.exampleCards}>J♥ → Q♥ → 6♣ → 6♦ → 6♥ → 7♥</Text>
          </View>
        </View>

        {/* Run Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚫 Run Restrictions</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Rule</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Allowed?</Text>
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
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.rule}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{row.allowed}</Text>
              </View>
            ))}
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
    color: '#e0e0e0',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    color: '#e0e0e0',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  rulesList: {
    marginBottom: 15,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  ruleNumber: {
    width: 28,
    height: 28,
    backgroundColor: '#ffd700',
    color: '#1a1a2e',
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 12,
  },
  ruleText: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 22,
  },
  exampleBox: {
    backgroundColor: '#1a3a1a',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  exampleBoxInvalid: {
    backgroundColor: '#3a1a1a',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  exampleLabel: {
    color: '#a0a0a0',
    fontSize: 12,
    marginBottom: 5,
  },
  exampleCards: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  note: {
    color: '#a0a0a0',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
  },
  pivotOptions: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 15,
  },
  pivotTitle: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pivotOption: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 22,
  },
  pivotOr: {
    color: '#a0a0a0',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
  table: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3a3a5e',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#ffd700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: '#252545',
  },
  tableCell: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 40,
  },
});
