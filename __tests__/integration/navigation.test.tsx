/**
 * Integration tests for app navigation flows
 * 
 * Tests complete user journeys through the app including:
 * - Home to rules and back
 * - Navigating through multiple rule sections
 * - Deep navigation and returning to home
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import App from '../../App';

describe('App Navigation Integration', () => {
  describe('Home to Rules Flow', () => {
    it('completes full navigation flow: Home → Rules Menu → Quick Start → Back → Back to Home', () => {
      render(<App />);
      
      // Start on Home
      expect(screen.getByText('BLACK JACK')).toBeTruthy();
      expect(screen.getByText('PLAY NOW')).toBeTruthy();
      
      // Navigate to Rules
      fireEvent.press(screen.getByText('How to Play'));
      
      // Should see Rules Menu with title and menu items
      expect(screen.getByText('Black Jack Black')).toBeTruthy();
      expect(screen.getByText('Quick Start')).toBeTruthy();
      
      // Navigate to Quick Start
      fireEvent.press(screen.getByText('Quick Start'));
      
      // Should see Quick Start content
      expect(screen.getByText('🎯 Goal')).toBeTruthy();
      expect(screen.getByText('🎮 On Your Turn')).toBeTruthy();
      
      // Go back to Rules Menu
      fireEvent.press(screen.getByText('← Back'));
      
      // Should see Rules Menu again
      expect(screen.getByText('Black Jack Black')).toBeTruthy();
      
      // Go back to Home
      fireEvent.press(screen.getByText('← Back'));
      
      // Should be back on Home
      expect(screen.getByText('BLACK JACK')).toBeTruthy();
      expect(screen.getByText('PLAY NOW')).toBeTruthy();
    });

    it('allows navigating through multiple rule sections', () => {
      render(<App />);
      
      // Navigate to Rules
      fireEvent.press(screen.getByText('How to Play'));
      
      // Visit Quick Start
      fireEvent.press(screen.getByText('Quick Start'));
      expect(screen.getByText('🎯 Goal')).toBeTruthy();
      fireEvent.press(screen.getByText('← Back'));
      
      // Visit Special Cards
      fireEvent.press(screen.getByText('Special Cards'));
      expect(screen.getByText('← Back')).toBeTruthy();
      fireEvent.press(screen.getByText('← Back'));
      
      // Visit Runs
      fireEvent.press(screen.getByText('Runs'));
      expect(screen.getByText('← Back')).toBeTruthy();
      fireEvent.press(screen.getByText('← Back'));
      
      // Should still be able to return home
      expect(screen.getByText('Black Jack Black')).toBeTruthy();
      fireEvent.press(screen.getByText('← Back'));
      expect(screen.getByText('BLACK JACK')).toBeTruthy();
    });
  });

  describe('State Persistence', () => {
    it('maintains app state correctly through navigation', () => {
      render(<App />);
      
      // Initial state
      expect(screen.getByText('BLACK JACK')).toBeTruthy();
      
      // Navigate away and back
      fireEvent.press(screen.getByText('How to Play'));
      expect(screen.queryByText('BLACK JACK')).toBeNull();
      
      fireEvent.press(screen.getByText('← Back'));
      expect(screen.getByText('BLACK JACK')).toBeTruthy();
      
      // All buttons should still work
      expect(screen.getByText('PLAY NOW')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();
    });
  });
});

describe('Rules Navigation Integration', () => {
  it('can access all rule sections from menu', () => {
    render(<App />);
    
    // Navigate to Rules
    fireEvent.press(screen.getByText('How to Play'));
    
    // Verify all menu items are accessible
    const menuItems = [
      'Quick Start',
      'Special Cards',
      'Runs',
      'Draw Pressure',
      'Penalties & Winning',
      'Cheat Sheet',
    ];
    
    menuItems.forEach(item => {
      expect(screen.getByText(item)).toBeTruthy();
    });
  });

  it('shows correct descriptions for each menu item', () => {
    render(<App />);
    
    fireEvent.press(screen.getByText('How to Play'));
    
    expect(screen.getByText('Learn the basics in 2 minutes')).toBeTruthy();
    expect(screen.getByText('Card powers and effects')).toBeTruthy();
    expect(screen.getByText('Play multiple cards in sequence')).toBeTruthy();
    expect(screen.getByText('Stacking and shielding')).toBeTruthy();
    expect(screen.getByText('Rules violations and victory')).toBeTruthy();
    expect(screen.getByText('Quick reference tables')).toBeTruthy();
  });
});
