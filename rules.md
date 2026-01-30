# Game Rules — Consolidated (v2025-08-19)

These rules consolidate all decisions we’ve made. This is a shedding game for **2–5 players** using a standard 52‑card deck (no Jokers).

> ## Setup Options (choose before you play)
>
> - **Players:** 2–5
> - **Hand size:** Deal **5 or 7** cards (default **5**).
> - **First player:** **Left of the dealer** goes first.
> - **Deck:** Standard **52-card** deck, no Jokers.
> - **Starting discard:** Flip one card face‑up to start the discard pile.

## Setup

- Deal the agreed hand size to each player (5 or 7). Remaining cards form the **draw pile**. Flip one card face‑up to start the **discard pile**.

## Turn & Matching

- On your turn you may **play** or **draw**.
- **Normal matching rule:** The **first card** you play on your turn must match the **top discard** by **suit or rank**.
- **Queen on top of discard:** If the top discard is a **Queen**, you may play **any card** to cover it (**free start**). A Queen on top **must be covered immediately** by the current player—see Penalties if not.

## Runs — Codified

A **run** is a sequence of cards you lay in a single turn. Unless modified below, normal matching applies only to the **first** card of your turn.

1. **Direction & step size**  
   Runs move strictly **in one direction** (increasing or decreasing). Adjacent run steps are **±1 rank** (e.g., 9→10 or 10→J). No jumps, except where the Queen pivot below allows it.
2. **Suit continuity on ±1 steps**  
   When stepping **±1 rank**, you must **stay in the same suit** (e.g., K♦→A♦ is legal; K♦→A♥ is not).
3. **Changing suit (same‑rank hops)**  
   You may change suit by playing **one or more cards of the same rank** (e.g., 6♣→6♦→6♥). Same‑rank hops **do not** count as direction changes. After the final hop, continue **±1** steps in the new suit.
4. **Ace wrap (once per run)**  
   **Ace is adjacent to both K and 2**. You may **wrap once per run** (…Q–K–A–2–3…). No second wrap later in the same run.
5. **Queen in runs (pivot rule)**  
   A **Queen** may be used in a run **only immediately after a J or K of the same suit** (e.g., J♣→Q♣ or K♥→Q♥). After playing a Queen, you must choose **one**:
   - **Cover immediately** with **any card** (any suit/rank). This **cover card** establishes the new suit/rank context; from that card onward, continue with the normal run rules (±1 steps, suit continuity, same‑rank hops, single Ace wrap).
   - **Decline to cover** and **draw 1** (**Queen‑not‑covered penalty**). Your turn **ends** and the **Queen remains on top**; the **next player** must cover it (free start).
6. **No direction flips mid‑run**  
   After your first **±1** step, you cannot reverse direction within the same run.
7. **First‑card constraint**  
   The **first card** you play each turn must still match the top discard by **suit or rank** (unless the top is a Queen, which is a free start).

## Queen — Summary

- **On top of discard:** Queen gives a **free start** to the current player but **must be covered immediately** (or incur the Queen‑not‑covered penalty below).
- **In runs (pivot):** Queen may appear **only after J or K of the same suit** and must be **immediately covered by any card** or you **draw 1** and pass with the **Queen left on top**.

## Card Effects

- **2** – next player draws **2**; multiple **2s stack**. **Under draw pressure**, **2s** and **Black Jacks** may be stacked **across suits/ranks** (normal matching is **waived** for these draw cards).
- **Black Jack (J♠/J♣)** – next player draws **5**; stacks with **2s** and other **Black Jacks** **across suits/ranks** while under draw pressure.
- **Red Jack (J♥/J♦)** – may be played **immediately** after any **2** or **Black Jack** (regardless of suit/rank) to **cancel all accumulated draw**. **Playing a Red Jack ends your turn** and passes play to the next player.
- **8** – **skip** the next player’s turn.
- **King** – **reverse** direction of play.
- **Ace** – **change the active suit** (for normal matching) to the suit of the Ace.
- These effects apply based on the **last card** placed in the turn.

## Draw Pressure & Shields — Codified

1. **When draw pressure applies**  
   Draw pressure exists when the top discard is a **2** or a **Black Jack** and you are the next player affected by its (possibly stacked) draw.
2. **Your legal options under draw pressure (choose one)**
   - **Stack** another **2** or **Black Jack** to increase the total (**across suits/ranks**, matching waived for these cards).
   - **Shield** with a **Red Jack** to cancel the **entire** total (**your turn ends**).  
     If you do neither (or cannot), you must **draw the full total** and your **turn ends**.
3. **Turn flow**  
   After a **stack**, draw pressure passes to the **next player**. After a **shield**, play passes to the **next player** with **no cards drawn**.
4. **Interaction with runs**  
   While under draw pressure, you **cannot** start a normal run until you first **stack, shield, or draw**.
5. **Deck exhaustion**  
   If the draw pile is depleted while drawing, reshuffle the discard pile (except its top card) to form a new deck and continue.

## Penalties — Codified

**General principle:** When a rule is broken, apply the penalty **immediately**. Draw penalty cards from the draw pile (reshuffle if needed).

1. **Mistake (illegal action)** – **Draw 2**, **turn ends**; illegal card(s) are retracted and the last legal top discard remains.  
   _(Examples: playing out of turn; illegal match; starting a run under draw pressure; using Queen in a run without preceding J/K of same suit; continuing to play after a Red Jack; extra wraps; direction flip mid‑run.)_
2. **Exposure (revealing hidden information)** – **Draw 1**, **turn continues**. _(If under draw pressure, the pressure still applies.)_
3. **Queen pivot not covered** – If you play a Queen in a run and **don’t cover it**, **draw 1** and **end your turn**; the **Queen stays on top** for the **next player** to cover (free start).
4. **Specific vs general penalties** – If a rule specifies its own penalty (e.g., **Last Card Declaration**), apply the **specific** penalty and **do not stack** Mistake/Exposure for the same incident.
5. **Order of operations** – Resolve penalties **before** any further play or effects, then continue normal turn flow (including any existing draw pressure).

## Last Card Declaration

- When you reach **one card**, you must **declare** (e.g., “last card”). If you **go out** without having declared beforehand, **draw 1** as a specific penalty (do not stack general penalties for the same incident).

## Winning

- You win when you have **no cards remaining** and have **complied** with the Last Card Declaration rule.

---

### Quick Reference: Draw & Cancel

| Trigger card             | Immediate effect on next player | Stacks?            | Can Red Jack (♥/♦) cancel? | Notes                                                                       |
| ------------------------ | ------------------------------- | ------------------ | ---------------------------- | --------------------------------------------------------------------------- |
| **2**                    | Draw **2**                      | Yes (totals add)   | **Yes**                      | Under draw pressure, **2/Black Jack** stacking may ignore suit/rank match.  |
| **Black Jack (J♣/J♠)** | Draw **5**                      | Yes (adds with 2s) | **Yes**                      | Red Jack ends your turn after cancel.                                       |
| **Red Jack (J♥/J♦)**   | —                               | —                  | —                            | May be played immediately vs 2/Black Jack; cancels all draw; **turn ends**. |
| **8**                    | Skip                            | —                  | No                           | —                                                                           |
| **King**                 | Reverse                         | —                  | No                           | —                                                                           |
| **Ace**                  | Change active suit              | —                  | No                           | Affects first card matching only.                                           |

### Quick Reference: Penalties

| Infraction                          | Penalty    | Turn Ends? | Notes                                                    |
| ----------------------------------- | ---------- | ---------- | -------------------------------------------------------- |
| **Mistake (illegal action)**        | Draw **2** | **Yes**    | Retract illegal play; last legal discard stays.          |
| **Exposure (revealed info)**        | Draw **1** | **No**     | Turn proceeds; draw pressure (if any) still applies.     |
| **Queen pivot not covered**         | Draw **1** | **Yes**    | Queen stays on top; next player must cover (free start). |
| **Last Card not declared (go out)** | Draw **1** | As applied | Specific penalty; don’t stack with Mistake/Exposure.     |

---

### Queen Pivot — Quick Examples

- **Valid (pivot then continue):** J♠ → Q♠ → 10♦ → 9♦
- **Invalid (wrong Queen suit):** J♣ → Q♥ → 9♦
- **Valid (chained same‑rank hops):** J♥ → Q♥ → 6♣ → 6♦ → 6♥ → 7♥

### Wrap & Direction — Examples

- **Valid wrap once:** Q♠ → K♠ → A♠ → 2♠ → 3♠
- **Invalid (second wrap):** …K → A → 2 → 3 → **A** → …
- **Invalid (direction flip):** …5♣ → 4♣ → **5♣**
