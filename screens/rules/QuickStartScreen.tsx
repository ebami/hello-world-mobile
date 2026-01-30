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
  onNavigate?: (section: string) => void;
}

export default function QuickStartScreen({ onBack, onNavigate }: RulesScreenProps) {
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
        {/* Goal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Goal</Text>
          <Text style={styles.paragraph}>
            Be the first to <Text style={styles.bold}>get rid of all your cards</Text>.
          </Text>
        </View>

        {/* Setup Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Setup</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• 2–5 players</Text>
            <Text style={styles.bullet}>• Deal 5 cards each (or 7 for longer games)</Text>
            <Text style={styles.bullet}>• Flip one card to start the discard pile</Text>
          </View>
        </View>

        {/* On Your Turn Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 On Your Turn</Text>
          
          <View style={styles.optionCard}>
            <Text style={styles.optionTitle}>Option 1: Play a card</Text>
            <Text style={styles.optionText}>
              Your card must match the top of the discard pile by:
            </Text>
            <Text style={styles.bullet}>• <Text style={styles.bold}>Same suit</Text> (e.g., ♥ on ♥)</Text>
            <Text style={styles.bullet}>• <Text style={styles.bold}>Same rank</Text> (e.g., 7 on 7)</Text>
          </View>

          <View style={styles.optionCard}>
            <Text style={styles.optionTitle}>Option 2: Draw</Text>
            <Text style={styles.optionText}>
              If you can't (or don't want to) play, draw one card from the deck.
            </Text>
          </View>
        </View>

        {/* Winning Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Winning</Text>
          <Text style={styles.paragraph}>
            When you play your <Text style={styles.bold}>last card</Text>, you win!
          </Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ You must say <Text style={styles.bold}>"Last card!"</Text> when you're down to one.
            </Text>
          </View>
        </View>

        {/* Ready for More Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Ready for More?</Text>
          <Text style={styles.paragraph}>Once you've got the basics, explore:</Text>
          
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => onNavigate?.('special-cards')}
          >
            <Text style={styles.linkButtonText}>🃏 Special Cards</Text>
            <Text style={styles.linkButtonSubtext}>Cards with powers (skip, reverse, draw penalties)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => onNavigate?.('runs')}
          >
            <Text style={styles.linkButtonText}>🔗 Runs</Text>
            <Text style={styles.linkButtonSubtext}>Play multiple cards in sequence</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => onNavigate?.('draw-pressure')}
          >
            <Text style={styles.linkButtonText}>⚡ Draw Pressure</Text>
            <Text style={styles.linkButtonSubtext}>Stack and cancel draw penalties</Text>
          </TouchableOpacity>
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
  bulletList: {
    marginLeft: 5,
  },
  bullet: {
    color: '#e0e0e0',
    fontSize: 16,
    lineHeight: 28,
  },
  optionCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  optionTitle: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  optionText: {
    color: '#e0e0e0',
    fontSize: 15,
    marginBottom: 8,
  },
  warningBox: {
    backgroundColor: '#4a3a00',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
  },
  warningText: {
    color: '#ffd700',
    fontSize: 15,
  },
  linkButton: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButtonSubtext: {
    color: '#a0a0a0',
    fontSize: 14,
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
