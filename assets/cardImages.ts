// Card image mapping for React Native
// React Native requires static imports for images, so we map them here
import type { Rank, Suit } from '../game/types';

// Import all card images
const cardImages: Record<string, any> = {
  // Clubs
  'A♣': require('./cards/ace_of_clubs.png'),
  '2♣': require('./cards/2_of_clubs.png'),
  '3♣': require('./cards/3_of_clubs.png'),
  '4♣': require('./cards/4_of_clubs.png'),
  '5♣': require('./cards/5_of_clubs.png'),
  '6♣': require('./cards/6_of_clubs.png'),
  '7♣': require('./cards/7_of_clubs.png'),
  '8♣': require('./cards/8_of_clubs.png'),
  '9♣': require('./cards/9_of_clubs.png'),
  '10♣': require('./cards/10_of_clubs.png'),
  'J♣': require('./cards/jack_of_clubs.png'),
  'Q♣': require('./cards/queen_of_clubs.png'),
  'K♣': require('./cards/king_of_clubs.png'),
  // Diamonds
  'A♦': require('./cards/ace_of_diamonds.png'),
  '2♦': require('./cards/2_of_diamonds.png'),
  '3♦': require('./cards/3_of_diamonds.png'),
  '4♦': require('./cards/4_of_diamonds.png'),
  '5♦': require('./cards/5_of_diamonds.png'),
  '6♦': require('./cards/6_of_diamonds.png'),
  '7♦': require('./cards/7_of_diamonds.png'),
  '8♦': require('./cards/8_of_diamonds.png'),
  '9♦': require('./cards/9_of_diamonds.png'),
  '10♦': require('./cards/10_of_diamonds.png'),
  'J♦': require('./cards/jack_of_diamonds.png'),
  'Q♦': require('./cards/queen_of_diamonds.png'),
  'K♦': require('./cards/king_of_diamonds.png'),
  // Hearts
  'A♥': require('./cards/ace_of_hearts.png'),
  '2♥': require('./cards/2_of_hearts.png'),
  '3♥': require('./cards/3_of_hearts.png'),
  '4♥': require('./cards/4_of_hearts.png'),
  '5♥': require('./cards/5_of_hearts.png'),
  '6♥': require('./cards/6_of_hearts.png'),
  '7♥': require('./cards/7_of_hearts.png'),
  '8♥': require('./cards/8_of_hearts.png'),
  '9♥': require('./cards/9_of_hearts.png'),
  '10♥': require('./cards/10_of_hearts.png'),
  'J♥': require('./cards/jack_of_hearts.png'),
  'Q♥': require('./cards/queen_of_hearts.png'),
  'K♥': require('./cards/king_of_hearts.png'),
  // Spades
  'A♠': require('./cards/ace_of_spades.png'),
  '2♠': require('./cards/2_of_spades.png'),
  '3♠': require('./cards/3_of_spades.png'),
  '4♠': require('./cards/4_of_spades.png'),
  '5♠': require('./cards/5_of_spades.png'),
  '6♠': require('./cards/6_of_spades.png'),
  '7♠': require('./cards/7_of_spades.png'),
  '8♠': require('./cards/8_of_spades.png'),
  '9♠': require('./cards/9_of_spades.png'),
  '10♠': require('./cards/10_of_spades.png'),
  'J♠': require('./cards/jack_of_spades.png'),
  'Q♠': require('./cards/queen_of_spades.png'),
  'K♠': require('./cards/king_of_spades.png'),
};

// Card back image (using a simple placeholder - could be replaced with actual card back)
export const cardBack = require('./cards/black_joker.png');

export function getCardImage(rank: Rank, suit: Suit): any {
  const key = `${rank}${suit}`;
  return cardImages[key] || cardBack;
}

export default cardImages;
