const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../../middleware/auth');
const judgeController = require('../../controllers/judgeController');

// @route   POST api/judges/score
// @desc    Submit judge score
// @access  Private
router.post(
  '/score',
  [
    auth,
    [
      check('debateId', 'Debate ID is required').not().isEmpty(),
      check('participantId', 'Participant ID is required').not().isEmpty(),
      check('position', 'Position is required').isIn(['for', 'against']),
      check('content', 'Content score is required').isInt({ min: 1, max: 10 }),
      check('delivery', 'Delivery score is required').isInt({ min: 1, max: 10 }),
      check('rebuttals', 'Rebuttals score is required').isInt({ min: 1, max: 10 }),
      check('organization', 'Organization score is required').isInt({ min: 1, max: 10 })
    ]
  ],
  judgeController.submitScore
);

// @route   GET api/judges/scores/:debateId
// @desc    Get all scores for a debate
// @access  Private
router.get('/scores/:debateId', auth, judgeController.getDebateScores);

// @route   POST api/judges/feedback
// @desc    Submit feedback
// @access  Private
router.post(
  '/feedback',
  [
    auth,
    [
      check('debateId', 'Debate ID is required').not().isEmpty(),
      check('participantId', 'Participant ID is required').not().isEmpty(),
      check('content', 'Feedback content is required').not().isEmpty()
    ]
  ],
  judgeController.submitFeedback
);

// @route   GET api/judges/feedback/:debateId
// @desc    Get feedback for a debate
// @access  Private
router.get('/feedback/:debateId', auth, judgeController.getDebateFeedback);

module.exports = router;