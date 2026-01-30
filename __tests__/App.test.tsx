/**
 * Unit tests for App component
 * 
 * Tests the root App component including:
 * - Proper rendering
 * - HomeScreen integration
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<App />);
    
    expect(toJSON()).toBeTruthy();
  });

  it('renders HomeScreen as the main component', () => {
    render(<App />);
    
    // HomeScreen should show the main title
    expect(screen.getByText('BLACK JACK')).toBeTruthy();
  });

  it('renders the Play Now button from HomeScreen', () => {
    render(<App />);
    
    expect(screen.getByText('PLAY NOW')).toBeTruthy();
  });
});
