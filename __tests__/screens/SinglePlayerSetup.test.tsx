import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SinglePlayerSetup from '../../screens/SinglePlayerSetup';

describe('SinglePlayerSetup', () => {
  describe('Rendering', () => {
    it('renders the header title', () => {
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={jest.fn()} />
      );
      expect(getByText('Single Player')).toBeTruthy();
    });

    it('renders all difficulty options', () => {
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={jest.fn()} />
      );
      expect(getByText('Easy')).toBeTruthy();
      expect(getByText('Medium')).toBeTruthy();
      expect(getByText('Hard')).toBeTruthy();
    });

    it('renders difficulty descriptions', () => {
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={jest.fn()} />
      );
      expect(getByText('Bot makes random mistakes')).toBeTruthy();
      expect(getByText('Balanced AI strategy')).toBeTruthy();
      expect(getByText('Aggressive, optimal play')).toBeTruthy();
    });

    it('renders the start game button', () => {
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={jest.fn()} />
      );
      expect(getByText('START GAME')).toBeTruthy();
    });

    it('renders game info section', () => {
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={jest.fn()} />
      );
      expect(getByText('🃏 Game Info')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button is pressed', () => {
      const onBack = jest.fn();
      const { getByText } = render(
        <SinglePlayerSetup onBack={onBack} onStartGame={jest.fn()} />
      );
      fireEvent.press(getByText('← Back'));
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('Difficulty Selection', () => {
    it('defaults to medium difficulty', () => {
      const onStartGame = jest.fn();
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={onStartGame} />
      );
      fireEvent.press(getByText('START GAME'));
      expect(onStartGame).toHaveBeenCalledWith('medium');
    });

    it('can select easy difficulty', () => {
      const onStartGame = jest.fn();
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={onStartGame} />
      );
      fireEvent.press(getByText('Easy'));
      fireEvent.press(getByText('START GAME'));
      expect(onStartGame).toHaveBeenCalledWith('easy');
    });

    it('can select hard difficulty', () => {
      const onStartGame = jest.fn();
      const { getByText } = render(
        <SinglePlayerSetup onBack={jest.fn()} onStartGame={onStartGame} />
      );
      fireEvent.press(getByText('Hard'));
      fireEvent.press(getByText('START GAME'));
      expect(onStartGame).toHaveBeenCalledWith('hard');
    });
  });
});
