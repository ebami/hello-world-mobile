/**
 * Unit tests for RulesNavigator component
 * 
 * Tests the rules navigation system including:
 * - Menu rendering
 * - Navigation between sections
 * - Back button functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RulesNavigator from '../../screens/rules/RulesNavigator';

describe('RulesNavigator', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    mockOnBack.mockClear();
  });

  describe('Menu Rendering', () => {
    it('renders the rules menu by default', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      expect(screen.getByText('How to Play')).toBeTruthy();
    });

    it('renders all menu items', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      expect(screen.getByText('Quick Start')).toBeTruthy();
      expect(screen.getByText('Special Cards')).toBeTruthy();
      expect(screen.getByText('Runs')).toBeTruthy();
      expect(screen.getByText('Draw Pressure')).toBeTruthy();
      expect(screen.getByText('Penalties & Winning')).toBeTruthy();
      expect(screen.getByText('Cheat Sheet')).toBeTruthy();
    });

    it('renders menu item descriptions', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      expect(screen.getByText('Learn the basics in 2 minutes')).toBeTruthy();
      expect(screen.getByText('Card powers and effects')).toBeTruthy();
      expect(screen.getByText('Play multiple cards in sequence')).toBeTruthy();
    });

    it('renders the back button', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      expect(screen.getByText('← Back')).toBeTruthy();
    });

    it('renders menu item icons', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      expect(screen.getByText('🚀')).toBeTruthy();
      expect(screen.getByText('🃏')).toBeTruthy();
      expect(screen.getByText('🔗')).toBeTruthy();
      expect(screen.getByText('⚡')).toBeTruthy();
      expect(screen.getByText('⚠️')).toBeTruthy();
      expect(screen.getByText('📋')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button is pressed from menu', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      const backButton = screen.getByText('← Back');
      fireEvent.press(backButton);
      
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('navigates to Quick Start screen when menu item is pressed', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      const quickStartItem = screen.getByText('Quick Start');
      fireEvent.press(quickStartItem);
      
      // Should now show Quick Start content
      expect(screen.getByText('How to Play')).toBeTruthy();
      expect(screen.getByText('🎯 Goal')).toBeTruthy();
    });

    it('navigates back to menu from Quick Start', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      // Navigate to Quick Start
      const quickStartItem = screen.getByText('Quick Start');
      fireEvent.press(quickStartItem);
      
      // Press back
      const backButton = screen.getByText('← Back');
      fireEvent.press(backButton);
      
      // Should be back at menu - has 'Black Jack Black' title
      expect(screen.getByText('Black Jack Black')).toBeTruthy();
    });

    it('navigates to Special Cards screen', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      const specialCardsItem = screen.getByText('Special Cards');
      fireEvent.press(specialCardsItem);
      
      // Should show Special Cards header
      expect(screen.getByText('Special Cards')).toBeTruthy();
    });

    it('navigates to Runs screen', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      const runsItem = screen.getByText('Runs');
      fireEvent.press(runsItem);
      
      // Should be on Runs screen
      expect(screen.getByText('← Back')).toBeTruthy();
    });

    it('navigates to Cheat Sheet screen', () => {
      render(<RulesNavigator onBack={mockOnBack} />);
      
      const cheatSheetItem = screen.getByText('Cheat Sheet');
      fireEvent.press(cheatSheetItem);
      
      // Should show Cheat Sheet content
      expect(screen.getByText('← Back')).toBeTruthy();
    });
  });

  describe('Without onBack prop', () => {
    it('renders without back button when onBack is not provided', () => {
      render(<RulesNavigator />);
      
      expect(screen.queryByText('← Back to Game')).toBeNull();
    });
  });
});
