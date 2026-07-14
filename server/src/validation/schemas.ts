/**
 * @fileoverview Runtime validation schemas for every client-to-server
 * Socket.IO event payload.
 *
 * TypeScript interfaces provide no runtime protection — untrusted clients are
 * free to ignore them. These Zod schemas are the actual trust boundary: every
 * inbound payload is parsed here before any field is read. Bounds are chosen
 * to reject obviously malicious input (empty/huge strings, non-finite or
 * out-of-range numbers, unknown fields) without changing legitimate gameplay.
 *
 * @module server/validation/schemas
 */

import { z } from 'zod';
import type { Suit, Rank } from '@hello-world/game-core';

// ========== Bounds ==========

/** Max length of a trimmed player display name. */
export const MAX_PLAYER_NAME = 24;
/** Room codes are exactly 6 uppercase-alphanumeric characters. */
export const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
/** Server-approved bounds for the room size a client may request. */
export const MIN_MAX_PLAYERS = 2;
export const MAX_MAX_PLAYERS = 4;
/**
 * Upper bound on cards submitted in a single `play_cards` command. A legal
 * meld can never approach a full hand; this only guards against absurd arrays.
 */
export const MAX_CARDS_PER_PLAY = 14;
/** Card id upper bound (canonical ids look like `"10♦"` — max 3 chars). */
const MAX_CARD_ID_LENGTH = 8;

// ========== Primitives ==========

const SUITS: readonly [Suit, ...Suit[]] = ['♠', '♥', '♦', '♣'];
const RANKS: readonly [Rank, ...Rank[]] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
];

export const suitSchema = z.enum(SUITS);
export const rankSchema = z.enum(RANKS);

/**
 * A card as it appears on the wire. `.strict()` rejects any extra properties,
 * so a client cannot smuggle additional fields through validation.
 *
 * NOTE (MFP-01 scope): this validates the *shape* of client-supplied cards.
 * Making the server derive cards from its own authoritative hand (so rank/suit
 * cannot be forged at all) is MFP-02.
 */
export const cardSchema = z
  .object({
    id: z.string().min(1).max(MAX_CARD_ID_LENGTH),
    rank: rankSchema,
    suit: suitSchema,
  })
  .strict();

const playerNameSchema = z.string().trim().min(1).max(MAX_PLAYER_NAME);

// ========== Event payload schemas ==========

/** `create_room` options. */
export const createRoomSchema = z
  .object({
    playerName: playerNameSchema,
    maxPlayers: z
      .number()
      .int()
      .min(MIN_MAX_PLAYERS)
      .max(MAX_MAX_PLAYERS)
      .optional(),
  })
  .strict();

/** `join_room` options. */
export const joinRoomSchema = z
  .object({
    roomId: z.string().regex(ROOM_CODE_REGEX),
    playerName: playerNameSchema,
  })
  .strict();

/**
 * `play_cards` payload. In MFP-01 the wire shape is still `Card[]`; MFP-02
 * replaces it with a `{ cardIds, declaredSuit }` command.
 */
export const playCardsSchema = z
  .array(cardSchema)
  .min(1)
  .max(MAX_CARDS_PER_PLAY);

// Validated output types (inferred from the schemas above).
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type PlayCardsInput = z.infer<typeof playCardsSchema>;
