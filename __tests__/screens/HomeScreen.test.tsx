/**
 * Unit tests for HomeScreen component
 * 
 * Tests the main home screen of the Blackjack app including:
 * - Rendering of UI elements
 * - Button interactions
 * - Navigation to rules
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';

describe('HomeScreen', () => {
  describe('Rendering', () => {
    it('renders the main title', () => {
      render(<HomeScreen />);
      
      expect(screen.getByText('BLACK JACK')).toBeTruthy();
    });

    it('renders the tagline', () => {
      render(<HomeScreen />);
      
      expect(screen.getByText('Test Your Luck. Beat the Dealer.')).toBeTruthy();
    });

    it('renders the Play Now button', () => {
      render(<HomeScreen />);
      
      expect(screen.getByText('PLAY NOW')).toBeTruthy();
    });

    it('renders the How to Play button', () => {
      render(<HomeScreen />);
      
      expect(screen.getByText('How to Play')).toBeTruthy();
    });

    it('renders the Settings button', () => {
      render(<HomeScreen />);
      
      expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('renders decorative card suits', () => {
      render(<HomeScreen />);
      
      expect(screen.getByText('♠')).toBeTruthy();
      expect(screen.getByText('♥')).toBeTruthy();
    });

    it('renders the footer text', () => {
      render(<HomeScreen />);
      
      expect(screen.getByText('🎰 High Stakes. Big Wins. 🎰')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('shows RulesNavigator when How to Play is pressed', () => {
      render(<HomeScreen />);
      
      const howToPlayButton = screen.getByText('How to Play');
      fireEvent.press(howToPlayButton);
      
      // After pressing, we should see the rules menu
      expect(screen.getByText('Quick Start')).toBeTruthy();
    });

    it('returns to home screen from rules when back is pressed', () => {
      render(<HomeScreen />);
      
      // Navigate to rules
      const howToPlayButton = screen.getByText('How to Play');
      fireEvent.press(howToPlayButton);
      
      // Verify we're in rules
      expect(screen.getByText('Quick Start')).toBeTruthy();
      
      // Press back button
      const backButton = screen.getByText('← Back');
      fireEvent.press(backButton);
      
      // Should be back on home screen
      expect(screen.getByText('PLAY NOW')).toBeTruthy();
    });
  });
});
