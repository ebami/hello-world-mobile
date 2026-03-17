import React, { useState } from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ErrorBoundary from '../../components/ErrorBoundary';

function ThrowingChild({ message = 'boom' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  const originalDev = (global as any).__DEV__;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    (global as any).__DEV__ = originalDev;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Text>Safe child</Text>
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe child')).toBeTruthy();
  });

  it('shows fallback UI and logs when a child throws', () => {
    (global as any).__DEV__ = true;

    render(
      <ErrorBoundary>
        <ThrowingChild message="kaboom" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
    expect(screen.getByText('The game encountered an unexpected error.')).toBeTruthy();
    expect(screen.getByText('kaboom')).toBeTruthy();
    expect(errorSpy.mock.calls.some((call) => call[0] === 'Game Error:')).toBe(true);
  });

  it('hides error details when not in development mode', () => {
    (global as any).__DEV__ = false;

    render(
      <ErrorBoundary>
        <ThrowingChild message="prod-failure" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
    expect(screen.queryByText('prod-failure')).toBeNull();
  });

  it('resets and calls onReset when Try Again is pressed', () => {
    const onReset = jest.fn();

    function Harness() {
      const [shouldThrow, setShouldThrow] = useState(true);

      return (
        <ErrorBoundary
          onReset={() => {
            setShouldThrow(false);
            onReset();
          }}
        >
          {shouldThrow ? <ThrowingChild message="temporary" /> : <Text>Recovered child</Text>}
        </ErrorBoundary>
      );
    }

    render(<Harness />);

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Recovered child')).toBeTruthy();
  });

  it('allows reset without an onReset callback', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="still-failing" />
      </ErrorBoundary>
    );

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(screen.getByText('Oops! Something went wrong')).toBeTruthy();
  });
});
