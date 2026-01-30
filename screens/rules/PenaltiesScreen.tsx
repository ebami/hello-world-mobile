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

export default function PenaltiesScreen({ onBack }: RulesScreenProps) {
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
        <Text style={styles.headerTitle}>Penalties & Winning</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Penalties Header */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Penalties</Text>
          <Text style={styles.paragraph}>
            When a rule is broken, apply the penalty <Text style={styles.bold}>immediately</Text>.
          </Text>
        </View>

        {/* Mistake */}
        <View style={styles.penaltyCard}>
          <View style={styles.penaltyHeader}>
            <Text style={styles.penaltyTitle}>Mistake</Text>
            <View style={styles.penaltyBadge}>
              <Text style={styles.penaltyBadgeText}>Draw 2</Text>
            </View>
            <View style={styles.turnEndsBadge}>
              <Text style={styles.turnEndsBadgeText}>Turn Ends</Text>
            </View>
          </View>
          <Text style={styles.penaltyDescription}>
            Any illegal action results in drawing 2 cards. Your turn ends and the illegal card is taken back.
          </Text>
          <View style={styles.examplesList}>
            <Text style={styles.examplesTitle}>Examples of mistakes:</Text>
            <Text style={styles.exampleItem}>• Playing out of turn</Text>
            <Text style={styles.exampleItem}>• Illegal match (wrong suit/rank)</Text>
            <Text style={styles.exampleItem}>• Starting a run while under draw pressure</Text>
            <Text style={styles.exampleItem}>• Using Queen after wrong card</Text>
            <Text style={styles.exampleItem}>• Continuing to play after a Red Jack</Text>
            <Text style={styles.exampleItem}>• Wrapping Ace twice in one run</Text>
            <Text style={styles.exampleItem}>• Changing direction mid-run</Text>
          </View>
        </View>

        {/* Exposure */}
        <View style={styles.penaltyCard}>
          <View style={styles.penaltyHeader}>
            <Text style={styles.penaltyTitle}>Exposure</Text>
            <View style={styles.penaltyBadgeMild}>
              <Text style={styles.penaltyBadgeText}>Draw 1</Text>
            </View>
            <View style={styles.turnContinuesBadge}>
              <Text style={styles.turnContinuesBadgeText}>Turn Continues</Text>
            </View>
          </View>
          <Text style={styles.penaltyDescription}>
            Revealing hidden information (like showing your cards) costs 1 card, but your turn continues.
          </Text>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              If you're under draw pressure, you still have to deal with that too.
            </Text>
          </View>
        </View>

        {/* Queen Not Covered */}
        <View style={styles.penaltyCard}>
          <View style={styles.penaltyHeader}>
            <Text style={styles.penaltyTitle}>Queen Not Covered</Text>
            <View style={styles.penaltyBadgeMild}>
              <Text style={styles.penaltyBadgeText}>Draw 1</Text>
            </View>
            <View style={styles.turnEndsBadge}>
              <Text style={styles.turnEndsBadgeText}>Turn Ends</Text>
            </View>
          </View>
          <Text style={styles.penaltyDescription}>
            If you play a Queen in a run and don't cover it:
          </Text>
          <Text style={styles.bulletItem}>• Draw 1 card</Text>
          <Text style={styles.bulletItem}>• Your turn ends</Text>
          <Text style={styles.bulletItem}>• Queen stays on top (next player gets free start)</Text>
        </View>

        {/* Quick Reference Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Quick Reference</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Infraction</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Penalty</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Ends?</Text>
            </View>
            {[
              { infraction: 'Mistake', penalty: 'Draw 2', ends: '✅ Yes' },
              { infraction: 'Exposure', penalty: 'Draw 1', ends: '❌ No' },
              { infraction: 'Queen not covered', penalty: 'Draw 1', ends: '✅ Yes' },
              { infraction: 'Last card not declared', penalty: 'Draw 1', ends: '—' },
            ].map((row, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.infraction}</Text>
                <Text style={[styles.tableCell, styles.penaltyCell, { flex: 1 }]}>{row.penalty}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{row.ends}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Last Card Declaration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Last Card Declaration</Text>
          <View style={styles.declarationCard}>
            <Text style={styles.declarationText}>
              When you're down to <Text style={styles.bold}>one card</Text>, you must announce it:
            </Text>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutText}>"Last card!" or "Uno!"</Text>
              <Text style={styles.calloutSubtext}>(or whatever you agree on)</Text>
            </View>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>If you forget:</Text>
              <Text style={styles.warningText}>• Draw 1 card as penalty</Text>
              <Text style={styles.warningText}>• You're back in the game</Text>
            </View>
          </View>
        </View>

        {/* Winning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Winning the Game</Text>
          <View style={styles.winningCard}>
            <Text style={styles.winningTitle}>You win when:</Text>
            <View style={styles.winningCondition}>
              <Text style={styles.winningNumber}>1</Text>
              <Text style={styles.winningText}>You have <Text style={styles.bold}>no cards left</Text></Text>
            </View>
            <View style={styles.winningCondition}>
              <Text style={styles.winningNumber}>2</Text>
              <Text style={styles.winningText}>You <Text style={styles.bold}>declared</Text> when you had one card</Text>
            </View>
            <Text style={styles.congratsText}>🎉 Congratulations — you've won! 🎉</Text>
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
  },
  bold: {
    fontWeight: 'bold',
    color: '#fff',
  },
  penaltyCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    marginTop: 12,
  },
  penaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  penaltyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  penaltyBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  penaltyBadgeMild: {
    backgroundColor: '#f39c12',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  penaltyBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  turnEndsBadge: {
    backgroundColor: '#c0392b',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  turnEndsBadgeText: {
    color: '#fff',
    fontSize: 11,
  },
  turnContinuesBadge: {
    backgroundColor: '#27ae60',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  turnContinuesBadgeText: {
    color: '#fff',
    fontSize: 11,
  },
  penaltyDescription: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 22,
  },
  examplesList: {
    backgroundColor: '#3a3a5e',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  examplesTitle: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exampleItem: {
    color: '#a0a0a0',
    fontSize: 13,
    lineHeight: 20,
  },
  bulletItem: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
  },
  noteBox: {
    backgroundColor: '#3a3a5e',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  noteText: {
    color: '#a0a0a0',
    fontSize: 14,
    fontStyle: 'italic',
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
    fontSize: 13,
  },
  penaltyCell: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  declarationCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
  },
  declarationText: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 22,
  },
  calloutBox: {
    backgroundColor: '#ffd700',
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    alignItems: 'center',
  },
  calloutText: {
    color: '#1a1a2e',
    fontSize: 22,
    fontWeight: 'bold',
  },
  calloutSubtext: {
    color: '#3a3a3a',
    fontSize: 12,
    marginTop: 5,
  },
  warningBox: {
    backgroundColor: '#4a3a00',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
  },
  warningTitle: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  warningText: {
    color: '#ffd700',
    fontSize: 14,
    lineHeight: 20,
  },
  winningCard: {
    backgroundColor: '#1a3a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  winningTitle: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  winningCondition: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  winningNumber: {
    width: 28,
    height: 28,
    backgroundColor: '#4caf50',
    color: '#fff',
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 12,
  },
  winningText: {
    color: '#e0e0e0',
    fontSize: 15,
  },
  congratsText: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
  },
  bottomSpacer: {
    height: 40,
  },
});
