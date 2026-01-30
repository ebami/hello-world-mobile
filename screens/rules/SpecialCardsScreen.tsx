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

export default function SpecialCardsScreen({ onBack }: RulesScreenProps) {
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
        <Text style={styles.headerTitle}>Special Cards</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Some cards have special effects when played. The effect applies based on the{' '}
          <Text style={styles.bold}>last card</Text> you play on your turn.
        </Text>

        {/* 2 Card */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardRank}>2</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Draw Two</Text>
              <Text style={styles.cardEffect}>Next player must draw 2 cards</Text>
            </View>
          </View>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 Can be stacked! If they have a 2, they can add it and pass +4 to the next player.
            </Text>
          </View>
        </View>

        {/* Black Jack */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBlack}>
              <Text style={styles.cardRank}>J</Text>
              <Text style={styles.cardSuit}>♠♣</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Black Jack — Draw Five</Text>
              <Text style={styles.cardEffect}>Next player must draw 5 cards</Text>
            </View>
          </View>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💡 Stacks with 2s and other Black Jacks.</Text>
          </View>
        </View>

        {/* Red Jack */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconRed}>
              <Text style={styles.cardRank}>J</Text>
              <Text style={styles.cardSuitRed}>♥♦</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Red Jack — Shield</Text>
              <Text style={styles.cardEffect}>Cancels all accumulated draw</Text>
            </View>
          </View>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Playing a Red Jack ends your turn immediately.
            </Text>
          </View>
        </View>

        {/* 8 Card */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardRank}>8</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Skip</Text>
              <Text style={styles.cardEffect}>Skip the next player's turn</Text>
            </View>
          </View>
        </View>

        {/* King */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardRank}>K</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Reverse</Text>
              <Text style={styles.cardEffect}>Reverse the direction of play</Text>
            </View>
          </View>
          <Text style={styles.note}>In a 2-player game, this acts like a skip.</Text>
        </View>

        {/* Ace */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardRank}>A</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Change Suit</Text>
              <Text style={styles.cardEffect}>The Ace's suit becomes the new active suit</Text>
            </View>
          </View>
          <Text style={styles.note}>Example: Play A♠ to change the required suit to ♠.</Text>
        </View>

        {/* Queen */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardRank}>Q</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Free Start / Pivot</Text>
              <Text style={styles.cardEffect}>Special matching rules apply</Text>
            </View>
          </View>
          <View style={styles.queenDetails}>
            <Text style={styles.queenSubtitle}>When on top of discard:</Text>
            <Text style={styles.bullet}>• Next player can play any card (free start)</Text>
            <Text style={styles.bullet}>• Queen must be covered — you can't skip it</Text>
            
            <Text style={[styles.queenSubtitle, { marginTop: 12 }]}>In runs:</Text>
            <Text style={styles.bullet}>• Can only follow a J or K of the same suit</Text>
            <Text style={styles.bullet}>• Must be covered immediately or draw 1</Text>
          </View>
        </View>

        {/* Quick Reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Quick Reference</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Card</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Effect</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Stack?</Text>
            </View>
            {[
              { card: '2', effect: 'Draw 2', stack: '✅' },
              { card: 'J♠/J♣', effect: 'Draw 5', stack: '✅' },
              { card: 'J♥/J♦', effect: 'Cancel draw', stack: '—' },
              { card: '8', effect: 'Skip', stack: '—' },
              { card: 'K', effect: 'Reverse', stack: '—' },
              { card: 'A', effect: 'Change suit', stack: '—' },
              { card: 'Q', effect: 'Free start', stack: '—' },
            ].map((row, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>{row.card}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.effect}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{row.stack}</Text>
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
    marginBottom: 10,
  },
  bold: {
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSection: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 65,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardIconBlack: {
    width: 50,
    height: 65,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardIconRed: {
    width: 50,
    height: 65,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardRank: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  cardSuit: {
    fontSize: 12,
    color: '#1a1a2e',
  },
  cardSuitRed: {
    fontSize: 12,
    color: '#e74c3c',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardEffect: {
    color: '#e0e0e0',
    fontSize: 14,
    marginTop: 4,
  },
  tipBox: {
    backgroundColor: '#3a3a5e',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  tipText: {
    color: '#a0d0ff',
    fontSize: 14,
  },
  warningBox: {
    backgroundColor: '#4a3a00',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
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
    marginTop: 10,
  },
  queenDetails: {
    marginTop: 12,
  },
  queenSubtitle: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bullet: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 22,
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
