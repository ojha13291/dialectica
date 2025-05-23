const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../../middleware/auth');
const debateController = require('../../controllers/debateController');

// @route   POST api/debates
// @desc    Create a debate
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('topic', 'Topic is required').not().isEmpty()
    ]
  ],
  debateController.createDebate
);

// @route   GET api/debates
// @desc    Get all public debates or user's debates
// @access  Private
router.get('/', auth, debateController.getDebates);

// @route   GET api/debates/:id
// @desc    Get debate by ID
// @access  Private
router.get('/:id', auth, debateController.getDebateById);

// @route   PUT api/debates/:id
// @desc    Update debate
// @access  Private
router.put('/:id', auth, debateController.updateDebate);

// @route   DELETE api/debates/:id
// @desc    Delete debate
// @access  Private
router.delete('/:id', auth, debateController.deleteDebate);

// @route   POST api/debates/:id/join
// @desc    Join a debate as participant, judge, or audience
// @access  Private
router.post('/:id/join', auth, debateController.joinDebate);

// @route   POST api/debates/:id/leave
// @desc    Leave a debate
// @access  Private
router.post('/:id/leave', auth, debateController.leaveDebate);

// @route   POST api/debates/:id/start
// @desc    Start a debate
// @access  Private
router.post('/:id/start', auth, debateController.startDebate);

// @route   POST api/debates/:id/end
// @desc    End a debate
// @access  Private
router.post('/:id/end', auth, debateController.endDebate);

// @route   POST api/debates/:id/transcript
// @desc    Save debate transcript
// @access  Private
router.post('/:id/transcript', auth, debateController.saveTranscript);

module.exports = router;