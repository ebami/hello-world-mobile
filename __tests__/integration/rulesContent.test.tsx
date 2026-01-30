/**
 * Integration tests for rules content
 * 
 * Tests that all rules screens display correct content and 
 * educational material is properly presented to users.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import App from '../../App';

describe('Rules Content Integration', () => {
  beforeEach(() => {
    render(<App />);
    // Navigate to Rules Menu
    fireEvent.press(screen.getByText('How to Play'));
  });

  describe('Quick Start Content', () => {
    beforeEach(() => {
      fireEvent.press(screen.getByText('Quick Start'));
    });

    it('displays the goal of the game', () => {
      expect(screen.getByText('🎯 Goal')).toBeTruthy();
      expect(screen.getByText(/get rid of all your cards/i)).toBeTruthy();
    });

    it('displays setup instructions', () => {
      expect(screen.getByText('⚙️ Setup')).toBeTruthy();
      expect(screen.getByText('• 2–5 players')).toBeTruthy();
    });

    it('displays turn options', () => {
      expect(screen.getByText('🎮 On Your Turn')).toBeTruthy();
      expect(screen.getByText('Option 1: Play a card')).toBeTruthy();
      expect(screen.getByText('Option 2: Draw')).toBeTruthy();
    });

    it('displays winning conditions', () => {
      expect(screen.getByText('🏆 Winning')).toBeTruthy();
    });
  });

  describe('Menu Item Visibility', () => {
    it('all menu items have icons', () => {
      expect(screen.getByText('🚀')).toBeTruthy(); // Quick Start
      expect(screen.getByText('🃏')).toBeTruthy(); // Special Cards
      expect(screen.getByText('🔗')).toBeTruthy(); // Runs
      expect(screen.getByText('⚡')).toBeTruthy(); // Draw Pressure
      expect(screen.getByText('⚠️')).toBeTruthy(); // Penalties
      expect(screen.getByText('📋')).toBeTruthy(); // Cheat Sheet
    });
  });
});

describe('Educational Content Accessibility', () => {
  it('provides clear instructional content for new players', () => {
    render(<App />);
    
    // Navigate to Quick Start
    fireEvent.press(screen.getByText('How to Play'));
    fireEvent.press(screen.getByText('Quick Start'));
    
    // Verify key learning content is present
    expect(screen.getByText(/Goal/i)).toBeTruthy();
    expect(screen.getByText(/Setup/i)).toBeTruthy();
    expect(screen.getByText(/On Your Turn/i)).toBeTruthy();
    expect(screen.getByText(/Winning/i)).toBeTruthy();
  });

  it('uses emoji icons for visual learning aids', () => {
    render(<App />);
    
    fireEvent.press(screen.getByText('How to Play'));
    
    // Menu uses emojis for quick recognition
    const emojis = ['🚀', '🃏', '🔗', '⚡', '⚠️', '📋'];
    emojis.forEach(emoji => {
      expect(screen.getByText(emoji)).toBeTruthy();
    });
  });
});
