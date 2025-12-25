import { Router } from 'express';
import { getDb } from '../config/firebase.js';

const router = Router();

// Start a game
router.post('/:matchId/start', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { gameType } = req.body;

    if (!gameType) {
      return res.status(400).json({ error: 'Game type is required' });
    }

    const db = getDb();

    // Verify user is part of this match
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let gameState;

    switch (gameType) {
      case 'two_truths':
        gameState = {
          type: 'two_truths',
          status: 'waiting_submission',
          currentPlayer: req.user.uid,
          submissions: {},
          guesses: {},
          round: 1,
        };
        break;

      case 'twenty_questions':
        gameState = {
          type: 'twenty_questions',
          status: 'waiting_topic',
          currentPlayer: req.user.uid,
          topic: null,
          questions: [],
          questionsRemaining: 20,
        };
        break;

      case 'word_association':
        const startWords = ['Ocean', 'Dream', 'Adventure', 'Music', 'Coffee', 'Stars'];
        gameState = {
          type: 'word_association',
          status: 'active',
          currentPlayer: req.user.uid,
          chain: [startWords[Math.floor(Math.random() * startWords.length)]],
          turnTimeout: 30,
        };
        break;

      case 'would_you_rather':
        // Get a random prompt
        const prompt = getRandomWouldYouRatherPrompt();
        gameState = {
          type: 'would_you_rather',
          status: 'choosing',
          prompt,
          choices: {},
          round: 1,
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid game type' });
    }

    // Save game state
    const convDoc = await db.collection('conversations').doc(matchId).get();

    if (convDoc.exists) {
      await db.collection('conversations').doc(matchId).update({
        gameState,
        updatedAt: new Date(),
      });
    } else {
      await db.collection('conversations').doc(matchId).set({
        conversationId: matchId,
        participants: [matchData.user1Id, matchData.user2Id],
        messages: [],
        gameState,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Notify other user via socket
    const io = req.app.get('io');
    if (io) {
      io.to(matchId).emit('game_started', {
        matchId,
        gameType,
        gameState,
        startedBy: req.user.uid,
      });
    }

    res.json({ gameState });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Submit a game move
router.post('/:matchId/move', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { move } = req.body;

    if (!move) {
      return res.status(400).json({ error: 'Move is required' });
    }

    const db = getDb();

    // Get conversation with game state
    const convDoc = await db.collection('conversations').doc(matchId).get();
    if (!convDoc.exists) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const convData = convDoc.data();
    const gameState = convData.gameState;

    if (!gameState) {
      return res.status(400).json({ error: 'No active game' });
    }

    let updatedGameState;

    switch (gameState.type) {
      case 'two_truths':
        updatedGameState = handleTwoTruthsMove(gameState, req.user.uid, move);
        break;

      case 'twenty_questions':
        updatedGameState = handleTwentyQuestionsMove(gameState, req.user.uid, move);
        break;

      case 'word_association':
        updatedGameState = handleWordAssociationMove(gameState, req.user.uid, move);
        break;

      case 'would_you_rather':
        updatedGameState = handleWouldYouRatherMove(gameState, req.user.uid, move);
        break;

      default:
        return res.status(400).json({ error: 'Invalid game type' });
    }

    await db.collection('conversations').doc(matchId).update({
      gameState: updatedGameState,
      updatedAt: new Date(),
    });

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.to(matchId).emit('game_move', {
        matchId,
        move,
        playerId: req.user.uid,
        gameState: updatedGameState,
      });
    }

    res.json({ gameState: updatedGameState });
  } catch (error) {
    console.error('Game move error:', error);
    res.status(500).json({ error: 'Failed to process move' });
  }
});

// Get current game state
router.get('/:matchId/state', async (req, res) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const convDoc = await db.collection('conversations').doc(matchId).get();
    if (!convDoc.exists) {
      return res.json({ gameState: null });
    }

    res.json({ gameState: convDoc.data().gameState || null });
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

// Helper functions for game logic

function handleTwoTruthsMove(gameState, playerId, move) {
  const newState = { ...gameState };

  if (move.type === 'submit_statements') {
    // Player submitting their two truths and a lie
    newState.submissions[playerId] = {
      statements: move.statements,
      lieIndex: move.lieIndex,
    };

    // If both players have submitted, move to guessing phase
    const submissions = Object.keys(newState.submissions);
    if (submissions.length === 2) {
      newState.status = 'guessing';
      newState.currentPlayer = submissions.find(id => id !== playerId);
    }
  } else if (move.type === 'guess') {
    // Player guessing the lie
    const otherPlayerId = Object.keys(newState.submissions).find(id => id !== playerId);
    newState.guesses[playerId] = move.guessIndex;

    const correct = move.guessIndex === newState.submissions[otherPlayerId].lieIndex;

    // Check if both players have guessed
    if (Object.keys(newState.guesses).length === 2) {
      newState.status = 'complete';
      newState.results = {
        [playerId]: correct,
      };
    }
  }

  return newState;
}

function handleTwentyQuestionsMove(gameState, playerId, move) {
  const newState = { ...gameState };

  if (move.type === 'set_topic') {
    newState.topic = move.topic;
    newState.status = 'asking';
    // Switch to other player
    newState.currentPlayer = null; // Will be set by other player asking
  } else if (move.type === 'question') {
    newState.questions.push({
      question: move.question,
      askedBy: playerId,
      answer: null,
    });
    newState.questionsRemaining--;
    newState.status = 'answering';
  } else if (move.type === 'answer') {
    const lastQuestion = newState.questions[newState.questions.length - 1];
    if (lastQuestion) {
      lastQuestion.answer = move.answer;
    }

    if (newState.questionsRemaining === 0) {
      newState.status = 'complete';
    } else {
      newState.status = 'asking';
    }
  } else if (move.type === 'guess') {
    newState.finalGuess = move.guess;
    newState.correct = move.guess.toLowerCase() === newState.topic.toLowerCase();
    newState.status = 'complete';
  }

  return newState;
}

function handleWordAssociationMove(gameState, playerId, move) {
  const newState = { ...gameState };

  if (move.type === 'word') {
    newState.chain.push(move.word);
    // Switch player
    newState.currentPlayer = playerId; // Will alternate
  }

  // End game if chain is too long or player gives up
  if (move.type === 'end' || newState.chain.length >= 20) {
    newState.status = 'complete';
  }

  return newState;
}

function handleWouldYouRatherMove(gameState, playerId, move) {
  const newState = { ...gameState };

  if (move.type === 'choose') {
    newState.choices = { ...newState.choices, [playerId]: move.choice };

    // Check if both players have chosen
    const numChoices = Object.keys(newState.choices).length;
    if (numChoices === 2) {
      newState.status = 'revealed';
    }
  } else if (move.type === 'next_prompt') {
    // Start a new round with a fresh prompt
    const newPrompt = getRandomWouldYouRatherPrompt();
    newState.prompt = newPrompt;
    newState.choices = {};
    newState.status = 'choosing';
    newState.round = (newState.round || 1) + 1;
  }

  return newState;
}

// Would You Rather prompts collection
const WOULD_YOU_RATHER_PROMPTS = [
  { optionA: 'Be able to fly', optionB: 'Be able to read minds' },
  { optionA: 'Live in a treehouse', optionB: 'Live in a houseboat' },
  { optionA: 'Only eat pizza forever', optionB: 'Never eat pizza again' },
  { optionA: 'Travel to the past', optionB: 'Travel to the future' },
  { optionA: 'Be invisible', optionB: 'Be able to teleport' },
  { optionA: 'Always be 10 minutes late', optionB: 'Always be 20 minutes early' },
  { optionA: 'Have no internet for a month', optionB: 'Have no phone for a month' },
  { optionA: 'Live without music', optionB: 'Live without movies' },
  { optionA: 'Be famous but unhappy', optionB: 'Be unknown but happy' },
  { optionA: 'Have a personal chef', optionB: 'Have a personal driver' },
  { optionA: 'Speak every language', optionB: 'Play every instrument' },
  { optionA: 'Live in the city', optionB: 'Live in the countryside' },
  { optionA: 'Have unlimited money', optionB: 'Have unlimited time' },
  { optionA: 'Be extremely lucky', optionB: 'Be extremely talented' },
  { optionA: 'Know how you die', optionB: 'Know when you die' },
  { optionA: 'Have a rewind button for life', optionB: 'Have a pause button for life' },
  { optionA: 'Be able to talk to animals', optionB: 'Speak all human languages' },
  { optionA: 'Never have to sleep', optionB: 'Never have to eat' },
  { optionA: 'Live in a world without seasons', optionB: 'Live in perpetual autumn' },
  { optionA: 'Have super strength', optionB: 'Have super speed' },
  { optionA: 'Always know when people are lying', optionB: 'Always get away with lying' },
  { optionA: 'Be the funniest person in the room', optionB: 'Be the smartest person in the room' },
  { optionA: 'Have a pause button for conversations', optionB: 'Have an undo button for texts' },
  { optionA: 'Only use email to communicate', optionB: 'Only use phone calls to communicate' },
  { optionA: 'Be able to remember everything', optionB: 'Be able to forget anything' },
  { optionA: 'Live in the Harry Potter universe', optionB: 'Live in the Star Wars universe' },
  { optionA: 'Have a pet dragon', optionB: 'Have a pet unicorn' },
  { optionA: 'Be stuck in a rom-com', optionB: 'Be stuck in an action movie' },
  { optionA: 'Always have perfect hair', optionB: 'Always have perfect skin' },
  { optionA: 'Win the lottery once', optionB: 'Live twice as long' },
  { optionA: 'Be a famous actor', optionB: 'Be a famous musician' },
  { optionA: 'Have your dream job but low salary', optionB: 'Have a boring job with high salary' },
  { optionA: 'Never be stuck in traffic', optionB: 'Never wait in line' },
  { optionA: 'Know all conspiracy theories are true', optionB: 'Know none of them are true' },
  { optionA: 'Have a magic carpet', optionB: 'Have a self-driving car' },
];

function getRandomWouldYouRatherPrompt() {
  return WOULD_YOU_RATHER_PROMPTS[Math.floor(Math.random() * WOULD_YOU_RATHER_PROMPTS.length)];
}

export default router;
