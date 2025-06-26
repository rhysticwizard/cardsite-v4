'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronRight, Search, BookOpen, X } from 'lucide-react';

// Complete rules structure from MTG Comprehensive Rules with detailed subsections
const rulesData = {
  sections: [
    {
      id: 1,
      title: "1. Game Concepts",
      subsections: [
        { 
          id: 100, 
          title: "100. General", 
          content: "These Magic rules apply to any Magic game with two or more players, including two-player games and multiplayer games.",
          subsections: [
            { id: "100.1", title: "100.1", content: "These Magic rules apply to any Magic game with two or more players, including two-player games and multiplayer games." },
            { id: "100.1a", title: "100.1a", content: "A two-player game is a game that begins with only two players." },
            { id: "100.1b", title: "100.1b", content: "A multiplayer game is a game that begins with more than two players. See section 8, \"Multiplayer Rules.\"" },
            { id: "100.2", title: "100.2", content: "To play, each player needs their own deck of traditional Magic cards, small items to represent any tokens and counters, and some way to clearly track life totals." },
            { id: "100.2a", title: "100.2a", content: "In constructed play (a way of playing in which each player creates their own deck ahead of time), each deck has a minimum deck size of 60 cards. A constructed deck may contain any number of basic land cards and no more than four of any card with a particular English name other than basic land cards." },
            { id: "100.2b", title: "100.2b", content: "In limited play (a way of playing in which each player gets the same quantity of unopened Magic product such as booster packs and creates their own deck using only this product and basic land cards), each deck has a minimum deck size of 40 cards." },
            { id: "100.2c", title: "100.2c", content: "Commander decks are subject to additional deckbuilding restrictions and requirements. See rule 903, \"Commander,\" for details." },
            { id: "100.2d", title: "100.2d", content: "Some formats and casual play variants allow players to use a supplementary deck of nontraditional Magic cards (see rule 108.2a). These supplementary decks have their own deck construction rules." },
            { id: "100.3", title: "100.3", content: "Some cards require coins or traditional dice. Some casual variants require additional items, such as specially designated cards, nontraditional Magic cards, and specialized dice." },
            { id: "100.4", title: "100.4", content: "Each player may also have a sideboard, which is a group of additional cards the player may use to modify their deck between games of a match." },
            { id: "100.4a", title: "100.4a", content: "In constructed play, a sideboard may contain no more than fifteen cards. The four-card limit (see rule 100.2a) applies to the combined deck and sideboard." },
            { id: "100.4b", title: "100.4b", content: "In limited play involving individual players, all cards in a player's card pool not included in their deck are in that player's sideboard." },
            { id: "100.4c", title: "100.4c", content: "In limited play involving the Two-Headed Giant multiplayer variant, all cards in a team's card pool but not in either player's deck are in that team's sideboard." },
            { id: "100.4d", title: "100.4d", content: "In limited play involving other multiplayer team variants, each card in a team's card pool but not in any player's deck is assigned to the sideboard of one of those players." },
            { id: "100.5", title: "100.5", content: "If a deck must contain at least a certain number of cards, that number is referred to as a minimum deck size. There is no maximum deck size for non-Commander decks." },
            { id: "100.6", title: "100.6", content: "Most Magic tournaments (organized play activities where players compete against other players to win prizes) have additional rules covered in the Magic: The Gathering Tournament Rules." },
            { id: "100.6a", title: "100.6a", content: "Tournaments usually consist of a series of matches. A two-player match usually involves playing until one player has won two games. A multiplayer match usually consists of only one game." },
            { id: "100.6b", title: "100.6b", content: "Players can use the Magic Store & Event Locator at Wizards.com/Locator to find tournaments in their area." },
            { id: "100.7", title: "100.7", content: "Certain cards are intended for casual play and may have features and text that aren't covered by these rules. These include Mystery Booster playtest cards, promotional cards and cards in \"Un-sets\" that were printed with a silver border." }
          ]
        },
        { 
          id: 101, 
          title: "101. The Magic Golden Rules", 
          content: "Whenever a card's text directly contradicts these rules, the card takes precedence.",
          subsections: [
            { id: "101.1", title: "101.1", content: "Whenever a card's text directly contradicts these rules, the card takes precedence. The card overrides only the rule that applies to that specific situation. The only exception is that a player can concede the game at any time (see rule 104.3a)." },
            { id: "101.2", title: "101.2", content: "When a rule or effect allows or directs something to happen, and another effect states that it can't happen, the \"can't\" effect takes precedence." },
            { id: "101.2a", title: "101.2a", content: "Adding abilities to objects and removing abilities from objects don't fall under this rule. (See rule 113.10.)" },
            { id: "101.3", title: "101.3", content: "Any part of an instruction that's impossible to perform is ignored. (In many cases the card will specify consequences for this; if it doesn't, there's no effect.)" },
            { id: "101.4", title: "101.4", content: "If multiple players would make choices and/or take actions at the same time, the active player (the player whose turn it is) makes any choices required, then the next player in turn order makes any choices required, followed by the remaining nonactive players in turn order." },
            { id: "101.4a", title: "101.4a", content: "If an effect has each player choose a card in a hidden zone, such as their hand or library, those cards may remain face down as they're chosen." },
            { id: "101.4b", title: "101.4b", content: "A player knows the choices made by the previous players when making their choice, except as specified in 101.4a." },
            { id: "101.4c", title: "101.4c", content: "If a player would make more than one choice at the same time, the player makes the choices in the order specified. If no order is specified, the player chooses the order." },
            { id: "101.4d", title: "101.4d", content: "If a choice made by a nonactive player causes the active player, or a different nonactive player earlier in the turn order, to have to make a choice, APNAP order is restarted for all outstanding choices." }
          ]
        },
        { 
          id: 102, 
          title: "102. Players", 
          content: "A player is one of the people in the game.",
          subsections: [
            { id: "102.1", title: "102.1", content: "A player is one of the people in the game. The active player is the player whose turn it is. The other players are nonactive players." },
            { id: "102.2", title: "102.2", content: "In a two-player game, a player's opponent is the other player." },
            { id: "102.3", title: "102.3", content: "In a multiplayer game between teams, a player's teammates are the other players on their team, and the player's opponents are all players not on their team." },
            { id: "102.4", title: "102.4", content: "A spell or ability may use the term \"your team\" as shorthand for \"you and/or your teammates.\" In a game that isn't a multiplayer game between teams, \"your team\" means the same thing as \"you.\"" }
          ]
        },
        { 
          id: 103, 
          title: "103. Starting the Game", 
          content: "At the start of a game, the players determine which one of them will choose who takes the first turn.",
          subsections: [
            { id: "103.1", title: "103.1", content: "At the start of a game, the players determine which one of them will choose who takes the first turn. In the first game of a match (including a single-game match), the players may use any mutually agreeable method (flipping a coin, rolling dice, etc.) to do so." },
            { id: "103.1a", title: "103.1a", content: "In a game using the shared team turns option, there is a starting team rather than a starting player." },
            { id: "103.1b", title: "103.1b", content: "In an Archenemy game, these methods aren't used to determine who takes the first turn. Rather, the archenemy takes the first turn." },
            { id: "103.2", title: "103.2", content: "Some games require additional steps that are taken after the starting player has been determined. Perform the actions listed in 103.2a–e in order, as applicable." },
            { id: "103.3", title: "103.3", content: "After the starting player has been determined and any additional steps performed, each player shuffles their deck so that the cards are in a random order." },
            { id: "103.4", title: "103.4", content: "Each player begins the game with a starting life total of 20. Some variant games have different starting life totals." },
            { id: "103.4a", title: "103.4a", content: "In a Two-Headed Giant game, each team's starting life total is 30." },
            { id: "103.4b", title: "103.4b", content: "In a Vanguard game, each player's starting life total is 20 plus or minus the life modifier of their vanguard card." },
            { id: "103.4c", title: "103.4c", content: "In a Commander game, each player's starting life total is 40." },
            { id: "103.5", title: "103.5", content: "Each player draws a number of cards equal to their starting hand size, which is normally seven. A player who is dissatisfied with their initial hand may take a mulligan." }
          ]
        },
        { 
          id: 104, 
          title: "104. Ending the Game", 
          content: "A game ends immediately when a player wins, when the game is a draw, or when the game is restarted.",
          subsections: [
            { id: "104.1", title: "104.1", content: "A game ends immediately when a player wins, when the game is a draw, or when the game is restarted." },
            { id: "104.2", title: "104.2", content: "There are several ways to win the game." },
            { id: "104.2a", title: "104.2a", content: "A player still in the game wins the game if that player's opponents have all left the game. This happens immediately and overrides all effects that would preclude that player from winning the game." },
            { id: "104.2b", title: "104.2b", content: "An effect may state that a player wins the game." },
            { id: "104.3", title: "104.3", content: "There are several ways to lose the game." },
            { id: "104.3a", title: "104.3a", content: "A player can concede the game at any time. A player who concedes leaves the game immediately. That player loses the game." },
            { id: "104.3b", title: "104.3b", content: "If a player's life total is 0 or less, that player loses the game the next time a player would receive priority. (This is a state-based action. See rule 704.)" },
            { id: "104.3c", title: "104.3c", content: "If a player is required to draw more cards than are left in their library, they draw the remaining cards and then lose the game the next time a player would receive priority." }
          ]
        },
        { 
          id: 105, 
          title: "105. Colors", 
          content: "There are five colors in the Magic game: white, blue, black, red, and green.",
          subsections: [
            { id: "105.1", title: "105.1", content: "There are five colors in the Magic game: white, blue, black, red, and green." },
            { id: "105.2", title: "105.2", content: "An object can be one or more of the five colors, or it can be no color at all. An object is the color or colors of the mana symbols in its mana cost, regardless of the color of its frame." },
            { id: "105.2a", title: "105.2a", content: "A monocolored object is exactly one of the five colors." },
            { id: "105.2b", title: "105.2b", content: "A multicolored object is two or more of the five colors." },
            { id: "105.2c", title: "105.2c", content: "A colorless object has no color." },
            { id: "105.3", title: "105.3", content: "Effects may change an object's color or give a color to a colorless object. If an effect gives an object a new color, the new color replaces all previous colors the object had." },
            { id: "105.4", title: "105.4", content: "If a player is asked to choose a color, they must choose one of the five colors. \"Multicolored\" is not a color. Neither is \"colorless.\"" },
            { id: "105.5", title: "105.5", content: "If an effect refers to a color pair, it means exactly two of the five colors. There are ten color pairs: white and blue, white and black, blue and black, blue and red, black and red, black and green, red and green, red and white, green and white, and green and blue." }
          ]
        }
        // Adding placeholder subsections for remaining rules to maintain structure
        // In a full implementation, these would contain all the detailed subsections
      ]
    },
    // ... rest of sections would be here with similar detailed subsection structure
    {
      id: 2,
      title: "2. Parts of a Card",
      subsections: [
        { id: 200, title: "200. General", content: "The parts of a card are name, mana cost, illustration, color indicator, type line, expansion symbol, text box, power and toughness, loyalty, defense, hand modifier, life modifier, and information below the text box.", subsections: [] },
        { id: 201, title: "201. Name", content: "The name of a card is printed on its upper left corner.", subsections: [] },
        { id: 202, title: "202. Mana Cost and Color", content: "A card's mana cost is indicated by mana symbols near the top right corner of the card.", subsections: [] },
        { id: 203, title: "203. Illustration", content: "The illustration is printed on the upper half of a card and has no effect on game play.", subsections: [] },
        { id: 204, title: "204. Color Indicator", content: "The color indicator is printed to the left of the type line directly below the illustration.", subsections: [] },
        { id: 205, title: "205. Type Line", content: "The type line is printed directly below the illustration. It contains the card's card type(s).", subsections: [] },
        { id: 206, title: "206. Expansion Symbol", content: "The expansion symbol indicates which Magic set a card is from.", subsections: [] },
        { id: 207, title: "207. Text Box", content: "The text box is printed on the lower half of the card. It usually contains rules text defining the card's abilities.", subsections: [] },
        { id: 208, title: "208. Power/Toughness", content: "A creature card has two numbers separated by a slash printed in its lower right corner.", subsections: [] },
        { id: 209, title: "209. Loyalty", content: "Each planeswalker card has a loyalty number printed in its lower right corner.", subsections: [] },
        { id: 210, title: "210. Defense", content: "Each battle card has a defense number printed in its lower right corner.", subsections: [] },
        { id: 211, title: "211. Hand Modifier", content: "Each vanguard card has a hand modifier printed in its lower left corner.", subsections: [] },
        { id: 212, title: "212. Life Modifier", content: "Each vanguard card has a life modifier printed in its lower right corner.", subsections: [] },
        { id: 213, title: "213. Information Below the Text Box", content: "Each card has information printed below the text box including collector number, rarity, and artist information.", subsections: [] }
      ]
    },
    {
      id: 3,
      title: "3. Card Types",
      subsections: [
        { id: 300, title: "300. General", content: "The card types are artifact, battle, conspiracy, creature, dungeon, enchantment, instant, kindred, land, phenomenon, plane, planeswalker, scheme, sorcery, and vanguard.", subsections: [] },
        { id: 301, title: "301. Artifacts", content: "Artifacts represent magical items, animated constructs, pieces of equipment, or other objects and devices.", subsections: [] },
        { id: 302, title: "302. Creatures", content: "Creatures represent beings that can fight for their controller.", subsections: [] },
        { id: 303, title: "303. Enchantments", content: "Enchantments represent persistent magical effects.", subsections: [] },
        { id: 304, title: "304. Instants", content: "Instant cards represent magical spells that take effect immediately.", subsections: [] },
        { id: 305, title: "305. Lands", content: "Lands represent locations under the player's control, most of which have mana abilities.", subsections: [] },
        { id: 306, title: "306. Planeswalkers", content: "Planeswalker cards represent powerful beings that players can call upon to fight for them.", subsections: [] },
        { id: 307, title: "307. Sorceries", content: "Sorcery cards represent magical spells.", subsections: [] },
        { id: 308, title: "308. Kindreds", content: "Kindred is a card type that allows noncreature cards to have creature types.", subsections: [] },
        { id: 309, title: "309. Dungeons", content: "Dungeon is a card type seen only on nontraditional Magic cards.", subsections: [] },
        { id: 310, title: "310. Battles", content: "Battle cards represent conflicts between forces greater than a single player.", subsections: [] },
        { id: 311, title: "311. Planes", content: "Plane is a card type seen only on nontraditional Magic cards.", subsections: [] },
        { id: 312, title: "312. Phenomena", content: "Phenomenon is a card type seen only on nontraditional Magic cards.", subsections: [] },
        { id: 313, title: "313. Vanguards", content: "Vanguard is a card type seen only on nontraditional Magic cards.", subsections: [] },
        { id: 314, title: "314. Schemes", content: "Scheme is a card type seen only on nontraditional Magic cards.", subsections: [] },
        { id: 315, title: "315. Conspiracies", content: "Conspiracy is a card type seen only on nontraditional Magic cards.", subsections: [] }
      ]
    },
    {
      id: 4,
      title: "4. Zones",
      subsections: [
        { id: 400, title: "400. General", content: "A zone is a place where objects can be during a game. There are normally seven zones: library, hand, battlefield, graveyard, stack, exile, and command.", subsections: [] },
        { id: 401, title: "401. Library", content: "A player's library is their deck. It's the pile of cards they draw from during the game.", subsections: [] },
        { id: 402, title: "402. Hand", content: "The hand is where a player holds cards that have been drawn but not yet played.", subsections: [] },
        { id: 403, title: "403. Battlefield", content: "The battlefield is the zone where permanents exist. It used to be called the 'in-play zone.'", subsections: [] },
        { id: 404, title: "404. Graveyard", content: "A player's graveyard is their discard pile. Any object that's countered, discarded, destroyed, or sacrificed is put on top of its owner's graveyard.", subsections: [] },
        { id: 405, title: "405. Stack", content: "The stack is the zone where spells and abilities wait to resolve.", subsections: [] },
        { id: 406, title: "406. Exile", content: "The exile zone is essentially a holding area for objects. Some spells and abilities exile an object without any way to return that object to another zone.", subsections: [] },
        { id: 407, title: "407. Ante", content: "Earlier versions of the Magic rules included an ante zone. The ante zone is used by a small number of older cards.", subsections: [] },
        { id: 408, title: "408. Command", content: "The command zone is a game area reserved for certain specialized objects that have a broad effect on the game, yet are not permanents and cannot be destroyed.", subsections: [] }
      ]
    },
    {
      id: 5,
      title: "5. Turn Structure",
      subsections: [
        { id: 500, title: "500. General", content: "A turn consists of five phases, in this order: beginning, precombat main, combat, postcombat main, and ending.", subsections: [] },
        { id: 501, title: "501. Beginning Phase", content: "The beginning phase consists of three steps, in this order: untap, upkeep, and draw.", subsections: [] },
        { id: 502, title: "502. Untap Step", content: "First, all phased-in permanents with phasing that the active player controls phase out, and all phased-out permanents that the active player controlled when they phased out phase in.", subsections: [] },
        { id: 503, title: "503. Upkeep Step", content: "The upkeep step has no turn-based actions. Once it begins, the active player gets priority.", subsections: [] },
        { id: 504, title: "504. Draw Step", content: "First, the active player draws a card. This turn-based action doesn't use the stack.", subsections: [] },
        { id: 505, title: "505. Main Phase", content: "There are two main phases in a turn. In each main phase, the active player receives priority and may cast spells and activate abilities.", subsections: [] },
        { id: 506, title: "506. Combat Phase", content: "The combat phase has five steps, which proceed in order: beginning of combat, declare attackers, declare blockers, combat damage, and end of combat.", subsections: [] },
        { id: 507, title: "507. Beginning of Combat Step", content: "First, if the game being played is a multiplayer game in which the active player's opponents don't all automatically become defending players.", subsections: [] },
        { id: 508, title: "508. Declare Attackers Step", content: "First, the active player declares attackers. This turn-based action doesn't use the stack.", subsections: [] },
        { id: 509, title: "509. Declare Blockers Step", content: "First, the defending player declares blockers. This turn-based action doesn't use the stack.", subsections: [] },
        { id: 510, title: "510. Combat Damage Step", content: "First, the active player announces how each attacking creature assigns its combat damage, then the defending player announces how each blocking creature assigns its combat damage.", subsections: [] },
        { id: 511, title: "511. End of Combat Step", content: "The end of combat step has no turn-based actions. Once it begins, the active player gets priority.", subsections: [] },
        { id: 512, title: "512. Ending Phase", content: "The ending phase consists of two steps: end and cleanup.", subsections: [] },
        { id: 513, title: "513. End Step", content: "The end step has no turn-based actions. Once it begins, the active player gets priority.", subsections: [] },
        { id: 514, title: "514. Cleanup Step", content: "First, if the active player's hand contains more cards than their maximum hand size, they discard down to that number.", subsections: [] }
      ]
    },
    {
      id: 6,
      title: "6. Spells, Abilities, and Effects",
      subsections: [
        { id: 600, title: "600. General", content: "This section describes the rules for spells and abilities.", subsections: [] },
        { id: 601, title: "601. Casting Spells", content: "Previously, the action of casting a spell, or casting a card as a spell, was referred to on cards as 'playing' that spell or that card.", subsections: [] },
        { id: 602, title: "602. Activating Activated Abilities", content: "Activated abilities have a cost and an effect. They are written as '[Cost]: [Effect.] [Activation instructions (if any).]'", subsections: [] },
        { id: 603, title: "603. Handling Triggered Abilities", content: "Triggered abilities have a trigger condition and an effect. They are written as '[When/Whenever/At] [trigger condition], [effect.]'", subsections: [] },
        { id: 604, title: "604. Handling Static Abilities", content: "Static abilities are written as statements. They're simply true.", subsections: [] },
        { id: 605, title: "605. Mana Abilities", content: "Some activated abilities and some triggered abilities are mana abilities, which are subject to special rules.", subsections: [] },
        { id: 606, title: "606. Loyalty Abilities", content: "Some activated abilities of planeswalkers are loyalty abilities.", subsections: [] },
        { id: 607, title: "607. Linked Abilities", content: "An object may have two abilities printed on it such that one of them causes actions to be taken or objects or players to be affected and the other one directly refers to those actions, objects, or players.", subsections: [] },
        { id: 608, title: "608. Resolving Spells and Abilities", content: "Each time all players pass in succession, the spell or ability on top of the stack resolves.", subsections: [] },
        { id: 609, title: "609. Effects", content: "The effects of spells and abilities change the rules of the game, the characteristics of objects, or the game state in any number of ways.", subsections: [] },
        { id: 610, title: "610. One-Shot Effects", content: "A one-shot effect does something just once and doesn't have a duration.", subsections: [] },
        { id: 611, title: "611. Continuous Effects", content: "A continuous effect modifies characteristics of objects, modifies control of objects, or affects players or the rules of the game, for a fixed or indefinite period.", subsections: [] },
        { id: 612, title: "612. Text-Changing Effects", content: "Some continuous effects change an object's text. This can apply to any words or symbols printed on that object, but generally affects only that object's rules text and/or its subtypes.", subsections: [] },
        { id: 613, title: "613. Interaction of Continuous Effects", content: "The values of an object's characteristics are determined by starting with the actual object.", subsections: [] },
        { id: 614, title: "614. Replacement Effects", content: "Some continuous effects are replacement effects. Like prevention effects, replacement effects apply continuously as events happen—they aren't cast or activated.", subsections: [] },
        { id: 615, title: "615. Prevention Effects", content: "Some continuous effects are prevention effects. Like replacement effects, prevention effects apply continuously as events happen—they aren't cast or activated.", subsections: [] },
        { id: 616, title: "616. Interaction of Replacement and/or Prevention Effects", content: "If two or more replacement and/or prevention effects are attempting to modify the way an event affects an object or player, the affected object's controller (or its owner if it has no controller) or the affected player chooses one to apply.", subsections: [] }
      ]
    },
    {
      id: 7,
      title: "7. Additional Rules",
      subsections: [
        { id: 700, title: "700. General", content: "Anything that happens in a game other than the basic rules covered in the previous sections is covered in this section.", subsections: [] },
        { id: 701, title: "701. Keyword Actions", content: "Most actions described in a card's rules text use the standard English definitions of the verbs within, but some specialized verbs are used whose meanings may not be clear.", subsections: [] },
        { id: 702, title: "702. Keyword Abilities", content: "Most abilities describe exactly what they do in the card's rules text. Some, though, are very common or would require too much space to define on the card.", subsections: [] },
        { id: 703, title: "703. Turn-Based Actions", content: "Turn-based actions are game actions that happen automatically when certain steps or phases begin, or when each step and phase ends.", subsections: [] },
        { id: 704, title: "704. State-Based Actions", content: "State-based actions are game actions that happen automatically whenever certain conditions are met.", subsections: [] },
        { id: 705, title: "705. Flipping a Coin", content: "To flip a coin for an object that cares about the results of the flip, the player flips the coin and calls 'heads' or 'tails.'", subsections: [] },
        { id: 706, title: "706. Rolling a Die", content: "Some cards instruct players to roll a die.", subsections: [] },
        { id: 707, title: "707. Copying Objects", content: "Some objects become or turn another object into a 'copy' of a spell, permanent, or card.", subsections: [] },
        { id: 708, title: "708. Face-Down Spells and Permanents", content: "Some cards allow spells and permanents to be face down.", subsections: [] },
        { id: 709, title: "709. Split Cards", content: "Split cards have two card faces on a single card. The back of a split card is the normal Magic card back.", subsections: [] },
        { id: 710, title: "710. Flip Cards", content: "Flip cards have a two-part card frame on a single card.", subsections: [] },
        { id: 711, title: "711. Leveler Cards", content: "Leveler cards have a striated text box and three power/toughness boxes.", subsections: [] },
        { id: 712, title: "712. Double-Faced Cards", content: "Double-faced cards have a Magic card face on each side rather than a Magic card face on one side and a Magic card back on the other.", subsections: [] },
        { id: 713, title: "713. Substitute Cards", content: "Some Magic sets feature double-faced cards or meld cards.", subsections: [] }
      ]
    },
    {
      id: 8,
      title: "8. Multiplayer Rules",
      subsections: [
        { id: 800, title: "800. General", content: "A multiplayer game is a game that begins with more than two players.", subsections: [] },
        { id: 801, title: "801. Limited Range of Influence Option", content: "Limited range of influence is an option that can be applied to most multiplayer games.", subsections: [] },
        { id: 802, title: "802. Attack Multiple Players Option", content: "Some multiplayer games allow the active player to attack multiple other players.", subsections: [] },
        { id: 803, title: "803. Attack Left and Attack Right Options", content: "Some multiplayer games use the attack left or attack right option.", subsections: [] },
        { id: 804, title: "804. Deploy Creatures Option", content: "The Emperor variant uses the deploy creatures option.", subsections: [] },
        { id: 805, title: "805. Shared Team Turns Option", content: "Some multiplayer games use the shared team turns option.", subsections: [] },
        { id: 806, title: "806. Free-for-All Variant", content: "In Free-for-All games, a group of players compete as individuals against each other.", subsections: [] },
        { id: 807, title: "807. Grand Melee Variant", content: "The Grand Melee variant is a modification of the Free-for-All variant.", subsections: [] },
        { id: 808, title: "808. Team vs. Team Variant", content: "The Team vs. Team variant involves two or more teams of equal size.", subsections: [] },
        { id: 809, title: "809. Emperor Variant", content: "The Emperor variant involves two or more teams of three players each.", subsections: [] },
        { id: 810, title: "810. Two-Headed Giant Variant", content: "Two-Headed Giant games are played with two teams of two players each.", subsections: [] },
        { id: 811, title: "811. Alternating Teams Variant", content: "Alternating Teams games are played with two or more teams of equal size.", subsections: [] }
      ]
    },
    {
      id: 9,
      title: "9. Casual Variants",
      subsections: [
        { id: 900, title: "900. General", content: "This section contains additional optional rules that can be used for certain casual game variants.", subsections: [] },
        { id: 901, title: "901. Planechase", content: "Planechase is a casual variant in which plane cards add additional abilities and randomness to the game.", subsections: [] },
        { id: 902, title: "902. Vanguard", content: "Vanguard is a casual variant in which each player plays the role of a famous character.", subsections: [] },
        { id: 903, title: "903. Commander", content: "Commander is a casual variant in which each deck is led by a legendary creature designated as the deck's commander.", subsections: [] },
        { id: 904, title: "904. Archenemy", content: "Archenemy is a casual variant in which a team of players faces off against a single opponent strengthened with powerful scheme cards.", subsections: [] },
        { id: 905, title: "905. Conspiracy Draft", content: "Conspiracy Draft is a casual variant in which players participate in a booster draft with Conspiracy booster packs.", subsections: [] }
      ]
    }
  ]
};

export default function RulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [filteredRules, setFilteredRules] = useState(rulesData.sections);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRules(rulesData.sections);
      return;
    }

    const filtered = rulesData.sections.map(section => ({
      ...section,
      subsections: section.subsections.filter(subsection =>
        subsection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subsection.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subsection.subsections && subsection.subsections.some((sub: any) =>
          sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.content.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
    })).filter(section => section.subsections.length > 0);

    setFilteredRules(filtered);
  }, [searchQuery]);

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectRule = (rule: any) => {
    setSelectedRule(rule);
  };

  return (
    <div className="text-white min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-8 pb-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Magic rules..."
              className="bg-black border-gray-600 text-white pl-4 pr-12 py-3 rounded-md focus:ring-0 focus:ring-offset-0 focus:border-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-600"
            />
            <button 
              onClick={searchQuery ? () => setSearchQuery('') : undefined}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {searchQuery ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {selectedRule ? (
            /* Selected Rule Display */
            <div>
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedRule(null)}
                  className="text-gray-400 hover:text-white mb-4"
                >
                  ← Back to overview
                </Button>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {selectedRule.title}
                </h1>
              </div>
              
              <div className="bg-black rounded-lg p-6 border border-gray-800">
                <p className="text-gray-300 leading-relaxed text-lg mb-6">
                  {selectedRule.content}
                </p>

                {/* Display detailed subsections if they exist */}
                {selectedRule.subsections && selectedRule.subsections.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
                      Detailed Rules
                    </h3>
                    <div className="space-y-3">
                      {selectedRule.subsections.map((subsection: any) => (
                        <div key={subsection.id} className="border-l-2 border-blue-500 pl-4">
                          <h4 className="font-semibold text-blue-400 mb-1">
                            {subsection.title}
                          </h4>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {subsection.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation to adjacent rules */}
              <div className="mt-8 flex justify-between">
                <div className="text-sm text-gray-500">
                  Rule {selectedRule.id}
                </div>
                <div className="text-sm text-gray-500">
                  MTG Comprehensive Rules
                </div>
              </div>
            </div>
          ) : (
            /* Category Buttons and Rules Sections */
            <div>
              <div className="flex justify-center space-x-4 mb-6">
                <Button
                  variant="outline"
                  className="bg-black border-gray-600 text-white hover:bg-gray-800 hover:text-white"
                >
                  Rules
                </Button>
                <Button
                  variant="outline"
                  className="bg-black border-gray-600 text-white hover:bg-gray-800 hover:text-white"
                >
                  Judge Training
                </Button>
                <Button
                  variant="outline"
                  className="bg-black border-gray-600 text-white hover:bg-gray-800 hover:text-white"
                >
                  How to Play
                </Button>
              </div>
              <hr className="border-gray-600 mb-6" />
              
              {/* Rules Sections - Centered */}
              <div className="max-w-2xl mx-auto">
                <div className="space-y-1">
                  {filteredRules.map((section) => (
                    <div key={section.id}>
                      <Button
                        variant="ghost"
                        onClick={() => toggleSection(section.id)}
                        className="w-full justify-start text-left px-2 py-2 text-white hover:bg-black font-normal"
                      >
                        <ChevronRight 
                          className={`w-4 h-4 mr-2 transition-transform ${
                            expandedSections.includes(section.id) ? 'rotate-90' : ''
                          }`} 
                        />
                        {section.title}
                      </Button>
                      
                      {/* Subsections */}
                      {expandedSections.includes(section.id) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {section.subsections.map((subsection) => (
                            <Button
                              key={subsection.id}
                              variant="ghost"
                              onClick={() => selectRule(subsection)}
                              className="w-full justify-start text-left px-2 py-1 text-sm text-gray-300 hover:text-white hover:bg-black font-normal"
                            >
                              <BookOpen className="w-3 h-3 mr-2" />
                              {subsection.title}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">
            © 2025 Wizards of the Coast LLC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}