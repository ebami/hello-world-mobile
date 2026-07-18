import {
  translateRoomError,
  ProtocolErrorException,
} from './validatedHandler';
import {
  RoomFullError,
  GameAlreadyStartedError,
  NameTakenError,
} from '../roomErrors';

describe('translateRoomError', () => {
  it('maps RoomFullError to a ROOM_FULL ProtocolError', () => {
    const result = translateRoomError(new RoomFullError());
    expect(result).toBeInstanceOf(ProtocolErrorException);
    expect((result as ProtocolErrorException).error.code).toBe('ROOM_FULL');
  });

  it('maps GameAlreadyStartedError to GAME_ALREADY_STARTED', () => {
    const result = translateRoomError(new GameAlreadyStartedError());
    expect(result).toBeInstanceOf(ProtocolErrorException);
    expect((result as ProtocolErrorException).error.code).toBe(
      'GAME_ALREADY_STARTED',
    );
  });

  it('maps NameTakenError to NAME_TAKEN', () => {
    const result = translateRoomError(new NameTakenError());
    expect(result).toBeInstanceOf(ProtocolErrorException);
    expect((result as ProtocolErrorException).error.code).toBe('NAME_TAKEN');
  });

  it('classifies by error type, not by message text (R1 regression)', () => {
    // The old implementation switched on Error.message; a reworded message
    // would silently degrade to INTERNAL_ERROR. Type-based classification must
    // survive a message change.
    const result = translateRoomError(new RoomFullError('totally new wording'));
    expect(result).toBeInstanceOf(ProtocolErrorException);
    expect((result as ProtocolErrorException).error.code).toBe('ROOM_FULL');
  });

  it('returns unknown errors unchanged so guard replies with a generic INTERNAL_ERROR', () => {
    const unexpected = new Error('something internal blew up');
    expect(translateRoomError(unexpected)).toBe(unexpected);
  });

  it('returns non-Error values unchanged', () => {
    const notAnError = { code: 'ROOM_FULL' };
    expect(translateRoomError(notAnError)).toBe(notAnError);
  });
});
