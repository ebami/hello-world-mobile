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
import type { Suit } from '@hello-world/game-core';

// ========== Bounds ==========

/** Max length of a trimmed player display name. */
export const MAX_PLAYER_NAME = 24;
/** Room codes are exactly 6 uppercase-alphanumeric characters. */
export const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
/**
 * Server-approved bounds for the room size a client may request. Online play
 * supports 2-4 players; the host picks a target within these bounds at room
 * creation and the strict schema rejects anything outside the range. The cap is
 * still server-owned — a client can never raise a room past MAX_MAX_PLAYERS.
 */
export const MIN_MAX_PLAYERS = 2;
export const MAX_MAX_PLAYERS = 4;
/**
 * Upper bound on cards submitted in a single `play_cards` command. A legal
 * meld can never approach a full hand; this only guards against absurd arrays.
 */
export const MAX_CARDS_PER_PLAY = 14;
/** Card id upper bound (canonical ids look like `"10♦"` — max 3 chars). */
const MAX_CARD_ID_LENGTH = 8;
/** Upper bound on a client-supplied command id (MFP-04). */
const MAX_COMMAND_ID_LENGTH = 64;
/** Opaque ids are UUIDs (~36 chars); allow headroom without being unbounded. */
const MAX_PLAYER_ID_LENGTH = 64;
/** Signed tokens are short; cap generously to reject absurd inputs. */
const MAX_TOKEN_LENGTH = 2048;

// ========== Primitives ==========

const SUITS: readonly [Suit, ...Suit[]] = ['♠', '♥', '♦', '♣'];

export const suitSchema = z.enum(SUITS);

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
 * Command metadata for idempotent, version-checked mutations (MFP-04). Optional
 * on the wire; when present it is strictly validated.
 */
export const commandMetadataSchema = z
  .object({
    commandId: z.string().min(1).max(MAX_COMMAND_ID_LENGTH),
    expectedStateVersion: z.number().int().min(0),
  })
  .strict();

/** No-payload commands may carry optional {@link commandMetadataSchema}. */
export const optionalCommandMetaSchema = commandMetadataSchema.optional();

/**
 * `play_cards` command (MFP-02). The client sends only card IDs plus an
 * optional declared suit — never a card's rank or physical suit — so the
 * server derives every played card from its own authoritative hand. `.strict()`
 * rejects any attempt to smuggle rank/suit or other fields. `meta` carries
 * optional idempotency/version metadata (MFP-04).
 */
export const playCardsCommandSchema = z
  .object({
    cardIds: z
      .array(z.string().min(1).max(MAX_CARD_ID_LENGTH))
      .min(1)
      .max(MAX_CARDS_PER_PLAY),
    declaredSuit: suitSchema.optional(),
    meta: commandMetadataSchema.optional(),
  })
  .strict();

/** `resume_session` credentials (MFP-04). */
export const resumeSessionSchema = z
  .object({
    roomId: z.string().regex(ROOM_CODE_REGEX),
    playerId: z.string().min(1).max(MAX_PLAYER_ID_LENGTH),
    reconnectToken: z.string().min(1).max(MAX_TOKEN_LENGTH),
  })
  .strict();

// Validated output types (inferred from the schemas above).
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type PlayCardsCommandInput = z.infer<typeof playCardsCommandSchema>;
export type CommandMetadataInput = z.infer<typeof commandMetadataSchema>;
export type ResumeSessionInput = z.infer<typeof resumeSessionSchema>;
