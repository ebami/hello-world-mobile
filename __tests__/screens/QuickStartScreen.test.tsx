/**
 * Unit tests for QuickStartScreen component
 * 
 * Tests the quick start rules screen including:
 * - Content rendering
 * - Back navigation
 * - Links to other sections
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import QuickStartScreen from '../../screens/rules/QuickStartScreen';

describe('QuickStartScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    mockOnBack.mockClear();
    mockOnNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('renders the header title', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText('How to Play')).toBeTruthy();
    });

    it('renders the Goal section', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText('🎯 Goal')).toBeTruthy();
    });

    it('renders the Setup section', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText('⚙️ Setup')).toBeTruthy();
    });

    it('renders the On Your Turn section', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText('🎮 On Your Turn')).toBeTruthy();
    });

    it('renders the Winning section', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText('🏆 Winning')).toBeTruthy();
    });

    it('renders setup instructions', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText(/2–5 players/)).toBeTruthy();
      expect(screen.getByText('• Deal 5 cards each (or 7 for longer games)')).toBeTruthy();
    });

    it('renders play options', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText('Option 1: Play a card')).toBeTruthy();
      expect(screen.getByText('Option 2: Draw')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('renders back button when onBack is provided', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      expect(screen.getByText('← Back')).toBeTruthy();
    });

    it('calls onBack when back button is pressed', () => {
      render(<QuickStartScreen onBack={mockOnBack} />);
      
      const backButton = screen.getByText('← Back');
      fireEvent.press(backButton);
      
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('does not render back button when onBack is not provided', () => {
      render(<QuickStartScreen />);
      
      expect(screen.queryByText('← Back')).toBeNull();
    });
  });

  describe('With onNavigate prop', () => {
    it('accepts onNavigate prop for section navigation', () => {
      // Render without errors
      const { toJSON } = render(
        <QuickStartScreen onBack={mockOnBack} onNavigate={mockOnNavigate} />
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });
});
