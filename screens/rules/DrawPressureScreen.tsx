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

export default function DrawPressureScreen({ onBack }: RulesScreenProps) {
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
        <Text style={styles.headerTitle}>Draw Pressure</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          When someone plays a <Text style={styles.bold}>2</Text> or{' '}
          <Text style={styles.bold}>Black Jack</Text>, the next player is under{' '}
          <Text style={styles.highlight}>draw pressure</Text>.
        </Text>

        {/* What is Draw Pressure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ What is Draw Pressure?</Text>
          <Text style={styles.paragraph}>
            You're under draw pressure when facing an accumulated draw penalty that you must respond to.
          </Text>
        </View>

        {/* Your Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Your Options</Text>
          <Text style={styles.paragraph}>When under draw pressure, you have <Text style={styles.bold}>three choices</Text>:</Text>

          {/* Option 1: Stack */}
          <View style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionEmoji}>🃏</Text>
              <Text style={styles.optionTitle}>1. Stack</Text>
            </View>
            <Text style={styles.optionText}>
              Play another <Text style={styles.bold}>2</Text> or <Text style={styles.bold}>Black Jack</Text> to increase the total and pass it on.
            </Text>
            <View style={styles.exampleBox}>
              <Text style={styles.exampleText}>
                Facing +2? Play a 2 to make it +4 for the next player.
              </Text>
            </View>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 Stacking ignores normal matching — you can play any 2 or Black Jack regardless of suit.
              </Text>
            </View>
          </View>

          {/* Option 2: Shield */}
          <View style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionEmoji}>🛡️</Text>
              <Text style={styles.optionTitle}>2. Shield</Text>
            </View>
            <Text style={styles.optionText}>
              Play a <Text style={styles.boldRed}>Red Jack (J♥ or J♦)</Text> to cancel the{' '}
              <Text style={styles.bold}>entire</Text> accumulated draw.
            </Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Your turn ends immediately after playing a Red Jack.
              </Text>
            </View>
          </View>

          {/* Option 3: Draw */}
          <View style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionEmoji}>📥</Text>
              <Text style={styles.optionTitle}>3. Draw</Text>
            </View>
            <Text style={styles.optionText}>
              If you can't or won't stack/shield, <Text style={styles.bold}>draw the full total</Text>.
            </Text>
            <Text style={styles.note}>Your turn ends after drawing.</Text>
          </View>
        </View>

        {/* Flow Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Flow Chart</Text>
          <View style={styles.flowChart}>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepText}>2 or Black Jack played</Text>
            </View>
            <Text style={styles.flowArrow}>↓</Text>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepText}>Next Player</Text>
            </View>
            <Text style={styles.flowArrow}>↓</Text>
            <View style={styles.flowDecision}>
              <Text style={styles.flowDecisionText}>Stack another 2/BJ?</Text>
              <Text style={styles.flowYes}>Yes → Pass +total to next</Text>
            </View>
            <Text style={styles.flowNo}>↓ No</Text>
            <View style={styles.flowDecision}>
              <Text style={styles.flowDecisionText}>Play Red Jack?</Text>
              <Text style={styles.flowYes}>Yes → Cancel all, turn ends</Text>
            </View>
            <Text style={styles.flowNo}>↓ No</Text>
            <View style={styles.flowEnd}>
              <Text style={styles.flowEndText}>Draw full total, turn ends</Text>
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Important Notes</Text>
          <View style={styles.notesList}>
            <Text style={styles.noteBullet}>• You <Text style={styles.bold}>cannot start a run</Text> while under draw pressure</Text>
            <Text style={styles.noteBullet}>• You must <Text style={styles.bold}>stack, shield, or draw first</Text></Text>
            <Text style={styles.noteBullet}>• Draw totals <Text style={styles.bold}>add up</Text>: 2+2+Black Jack = +9 cards</Text>
          </View>
        </View>

        {/* Stacking Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Stacking Examples</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Cards Played</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Total</Text>
            </View>
            {[
              { cards: '2', total: '+2' },
              { cards: '2 → 2', total: '+4' },
              { cards: '2 → Black Jack', total: '+7' },
              { cards: 'Black Jack → Black Jack', total: '+10' },
              { cards: '2 → 2 → 2 → Black Jack', total: '+11' },
            ].map((row, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.cards}</Text>
                <Text style={[styles.tableCell, styles.totalCell, { flex: 1 }]}>{row.total}</Text>
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
  boldRed: {
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  highlight: {
    fontWeight: 'bold',
    color: '#ffd700',
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
  optionCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    marginTop: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  optionTitle: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionText: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 22,
  },
  exampleBox: {
    backgroundColor: '#3a3a5e',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  exampleText: {
    color: '#a0d0ff',
    fontSize: 14,
    fontStyle: 'italic',
  },
  tipBox: {
    backgroundColor: '#1a3a4a',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  tipText: {
    color: '#a0d0ff',
    fontSize: 14,
  },
  warningBox: {
    backgroundColor: '#4a3a00',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ffd700',
  },
  warningText: {
    color: '#ffd700',
    fontSize: 14,
  },
  note: {
    color: '#a0a0a0',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  flowChart: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  flowStep: {
    backgroundColor: '#3a3a5e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  flowStepText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  flowArrow: {
    color: '#ffd700',
    fontSize: 20,
    marginVertical: 5,
  },
  flowDecision: {
    backgroundColor: '#4a3a5e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: '100%',
    alignItems: 'center',
  },
  flowDecisionText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  flowYes: {
    color: '#4caf50',
    fontSize: 12,
    marginTop: 5,
  },
  flowNo: {
    color: '#a0a0a0',
    fontSize: 14,
    marginVertical: 5,
  },
  flowEnd: {
    backgroundColor: '#3a1a1a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  flowEndText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notesList: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
  },
  noteBullet: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 26,
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
    paddingHorizontal: 15,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#ffd700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  tableRowAlt: {
    backgroundColor: '#252545',
  },
  tableCell: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  totalCell: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
});
