const { validationResult } = require('express-validator');
const JudgeScore = require('../models/JudgeScore');
const Feedback = require('../models/Feedback');
const Debate = require('../models/Debate');

// @route   POST api/judges/score
// @desc    Submit judge score
// @access  Private
exports.submitScore = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        debateId,
        participantId,
        position,
        content,
        delivery,
        rebuttals,
        organization,
        notes
    } = req.body;

    try {
        // Check if debate exists
        const debate = await Debate.findById(debateId);
        if (!debate) {
            return res.status(404).json({ msg: 'Debate not found' });
        }

        // Check if user is a judge for this debate
        const isJudge = debate.judges.some(j => j.user.toString() === req.user.id);
        if (!isJudge && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized to judge this debate' });
        }

        // Check if participant exists in the debate
        const isParticipant = debate.participants.some(
            p => p.user.toString() === participantId && p.position === position
        );
        if (!isParticipant) {
            return res.status(404).json({ msg: 'Participant not found in this debate' });
        }

        // Calculate total score
        const totalScore = content + delivery + rebuttals + organization;

        // Check if score already exists and update it, or create new
        let judgeScore = await JudgeScore.findOne({
            debate: debateId,
            judge: req.user.id,
            participant: participantId
        });

        if (judgeScore) {
            // Update existing score
            judgeScore.scores = {
                content,
                delivery,
                rebuttals,
                organization
            };
            judgeScore.totalScore = totalScore;
            judgeScore.notes = notes;
        } else {
            // Create new score
            judgeScore = new JudgeScore({
                debate: debateId,
                judge: req.user.id,
                participant: participantId,
                position,
                scores: {
                    content,
                    delivery,
                    rebuttals,
                    organization
                },
                totalScore,
                notes
            });
        }

        await judgeScore.save();
        res.json(judgeScore);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @route   GET api/judges/scores/:debateId
// @desc    Get all scores for a debate
// @access  Private
exports.getDebateScores = async (req, res) => {
    try {
        const debate = await Debate.findById(req.params.debateId);
        if (!debate) {
            return res.status(404).json({ msg: 'Debate not found' });
        }

        // Check authorization
        const isCreator = debate.createdBy.toString() === req.user.id;
        const isJudge = debate.judges.some(j => j.user.toString() === req.user.id);
        const isParticipant = debate.participants.some(p => p.user.toString() === req.user.id);

        if (!isCreator && !isJudge && !isParticipant && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized to view scores' });
        }

        // Get scores
        const scores = await JudgeScore.find({ debate: req.params.debateId })
            .populate('judge', 'name avatar')
            .populate('participant', 'name avatar');

        res.json(scores);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Debate not found' });
        }
        res.status(500).send('Server error');
    }
};

// @route   POST api/judges/feedback
// @desc    Submit feedback
// @access  Private
exports.submitFeedback = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { debateId, participantId, content, isPublic } = req.body;

    try {
        // Check if debate exists
        const debate = await Debate.findById(debateId);
        if (!debate) {
            return res.status(404).json({ msg: 'Debate not found' });
        }

        // Check if user is a judge for this debate
        const isJudge = debate.judges.some(j => j.user.toString() === req.user.id);
        if (!isJudge && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized to provide feedback for this debate' });
        }

        // Check if participant exists in the debate
        const participantExists = debate.participants.some(
            p => p.user.toString() === participantId
        );
        if (!participantExists) {
            return res.status(404).json({ msg: 'Participant not found in this debate' });
        }

        // Create feedback
        const feedback = new Feedback({
            debate: debateId,
            from: req.user.id,
            to: participantId,
            content,
            isPublic: isPublic || false
        });

        await feedback.save();
        res.json(feedback);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @route   GET api/judges/feedback/:debateId
// @desc    Get feedback for a debate
// @access  Private
exports.getDebateFeedback = async (req, res) => {
    try {
        const debate = await Debate.findById(req.params.debateId);
        if (!debate) {
            return res.status(404).json({ msg: 'Debate not found' });
        }

        let query = { debate: req.params.debateId };

        // If not admin, filter based on role
        if (req.user.role !== 'admin') {
            const isCreator = debate.createdBy.toString() === req.user.id;
            const isJudge = debate.judges.some(j => j.user.toString() === req.user.id);

            if (isJudge) {
                // Judges can see their own feedback
                query.from = req.user.id;
            } else if (!isCreator) {
                // Participants can see public feedback and feedback directed to them
                query.$or = [
                    { isPublic: true },
                    { to: req.user.id }
                ];
            }
            // Creators can see all feedback
        }

        const feedback = await Feedback.find(query)
            .populate('from', 'name avatar')
            .populate('to', 'name avatar');

        res.json(feedback);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Debate not found' });
        }
        res.status(500).send('Server error');
    }
};