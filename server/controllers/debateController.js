const { validationResult } = require('express-validator');
const Debate = require('../models/Debate');
const User = require('../models/User');

// @route   POST api/debates
// @desc    Create a debate
// @access  Private
exports.createDebate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    topic,
    description,
    format,
    customRules,
    isPublic,
    scheduledTime,
    duration,
    speechTimeLimit
  } = req.body;

  try {
    // Create debate instance
    const newDebate = new Debate({
      title,
      topic,
      description,
      format,
      customRules,
      isPublic,
      createdBy: req.user.id,
      scheduledTime,
      duration,
      speechTimeLimit,
      accessCode: isPublic ? null : Math.random().toString(36).substring(2, 8).toUpperCase()
    });

    const debate = await newDebate.save();

    // Add debate to user's debates
    await User.findByIdAndUpdate(req.user.id, {
      $push: { debates: debate._id }
    });

    res.json(debate);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/debates
// @desc    Get all public debates or user's debates
// @access  Private
exports.getDebates = async (req, res) => {
  try {
    const { filter, limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    // Filter options
    if (filter === 'my') {
      query.createdBy = req.user.id;
    } else if (filter === 'participating') {
      query['participants.user'] = req.user.id;
    } else if (filter === 'judging') {
      query['judges.user'] = req.user.id;
    } else if (filter === 'upcoming') {
      query.scheduledTime = { $gt: new Date() };
      query.status = { $ne: 'cancelled' };
    } else {
      // Default: public debates
      query.isPublic = true;
    }
    
    const debates = await Debate.find(query)
      .sort({ scheduledTime: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name avatar')
      .populate('participants.user', 'name avatar')
      .populate('judges.user', 'name avatar');
    
    const total = await Debate.countDocuments(query);
    
    res.json({
      debates,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/debates/:id
// @desc    Get debate by ID
// @access  Private
exports.getDebateById = async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id)
      .populate('createdBy', 'name avatar')
      .populate('participants.user', 'name avatar')
      .populate('judges.user', 'name avatar')
      .populate('audience.user', 'name avatar');
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Check if debate is private and user has access
    if (!debate.isPublic) {
      const isCreator = debate.createdBy._id.toString() === req.user.id;
      const isParticipant = debate.participants.some(p => p.user._id.toString() === req.user.id);
      const isJudge = debate.judges.some(j => j.user._id.toString() === req.user.id);
      const isAudience = debate.audience.some(a => a.user._id.toString() === req.user.id);
      
      if (!isCreator && !isParticipant && !isJudge && !isAudience) {
        return res.status(403).json({ msg: 'Access denied' });
      }
    }

    res.json(debate);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Debate not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   PUT api/debates/:id
// @desc    Update debate
// @access  Private
exports.updateDebate = async (req, res) => {
  const {
    title,
    topic,
    description,
    format,
    customRules,
    isPublic,
    scheduledTime,
    duration,
    speechTimeLimit,
    status
  } = req.body;

  try {
    let debate = await Debate.findById(req.params.id);
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Check ownership
    if (debate.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Build debate object
    const debateFields = {};
    if (title) debateFields.title = title;
    if (topic) debateFields.topic = topic;
    if (description) debateFields.description = description;
    if (format) debateFields.format = format;
    if (customRules) debateFields.customRules = customRules;
    if (isPublic !== undefined) {
      debateFields.isPublic = isPublic;
      if (!isPublic && !debate.accessCode) {
        debateFields.accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    }
    if (scheduledTime) debateFields.scheduledTime = scheduledTime;
    if (duration) debateFields.duration = duration;
    if (speechTimeLimit) debateFields.speechTimeLimit = speechTimeLimit;
    if (status) debateFields.status = status;

    // Update
    debate = await Debate.findByIdAndUpdate(
      req.params.id,
      { $set: debateFields },
      { new: true }
    );

    res.json(debate);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Debate not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   DELETE api/debates/:id
// @desc    Delete debate
// @access  Private
exports.deleteDebate = async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id);
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Check ownership
    if (debate.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    await debate.remove();
    
    // Remove from user's debates
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { debates: req.params.id }
    });

    res.json({ msg: 'Debate removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Debate not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   POST api/debates/:id/join
// @desc    Join a debate as participant, judge, or audience
// @access  Private
exports.joinDebate = async (req, res) => {
  const { role, position, accessCode } = req.body;
  
  try {
    const debate = await Debate.findById(req.params.id);
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Check if debate is private and requires access code
    if (!debate.isPublic && debate.accessCode !== accessCode) {
      return res.status(403).json({ msg: 'Invalid access code' });
    }

    // Check if user is already in the debate
    const isParticipant = debate.participants.some(p => p.user.toString() === req.user.id);
    const isJudge = debate.judges.some(j => j.user.toString() === req.user.id);
    const isAudience = debate.audience.some(a => a.user.toString() === req.user.id);
    
    if (isParticipant || isJudge || isAudience) {
      return res.status(400).json({ msg: 'Already joined this debate' });
    }

    // Join based on role
    if (role === 'participant') {
      if (!position || !['for', 'against', 'moderator'].includes(position)) {
        return res.status(400).json({ msg: 'Valid position required for participants' });
      }
      
      // Check if position is already taken
      const positionTaken = debate.participants.some(p => p.position === position);
      if (positionTaken && position !== 'audience') {
        return res.status(400).json({ msg: 'This position is already taken' });
      }
      
      debate.participants.push({
        user: req.user.id,
        position
      });
    } else if (role === 'judge') {
      debate.judges.push({
        user: req.user.id
      });
      
      // Add to user's judged debates
      await User.findByIdAndUpdate(req.user.id, {
        $push: { judgedDebates: debate._id }
      });
    } else {
      // Default to audience
      debate.audience.push({
        user: req.user.id
      });
    }

    await debate.save();
    
    res.json(debate);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Debate not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   POST api/debates/:id/leave
// @desc    Leave a debate
// @access  Private
exports.leaveDebate = async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id);
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Remove user from participants, judges, or audience
    debate.participants = debate.participants.filter(
      p => p.user.toString() !== req.user.id
    );
    
    debate.judges = debate.judges.filter(
      j => j.user.toString() !== req.user.id
    );
    
    debate.audience = debate.audience.filter(
      a => a.user.toString() !== req.user.id
    );

    await debate.save();
    
    // Remove from user's judged debates if applicable
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { judgedDebates: debate._id }
    });

    res.json({ msg: 'Successfully left the debate' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Debate not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   POST api/debates/:id/start
// @desc    Start a debate
// @access  Private
exports.startDebate = async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id);
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Check ownership
    if (debate.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Check if debate can be started
    if (debate.status !== 'scheduled') {
      return res.status(400).json({ msg: `Debate is already ${debate.status}` });
    }

    // Check if there are participants
    if (debate.participants.length < 2) {
      return res.status(400).json({ msg: 'Need at least two participants to start' });
    }

    debate.status = 'active';
    await debate.save();
    
    res.json(debate);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Debate not found' });
    }
    res.status(500).send('Server error');
  }
};

// @route   POST api/debates/:id/end
// @desc    End a debate
// @access  Private
exports.endDebate = async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id);
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Check ownership
    if (debate.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Check if debate can be ended
    if (debate.status !== 'active') {
      return res.status(400).json({ msg: `Cannot end a debate that is ${debate.status}` });
    }

    debate.status = 'completed';
    await debate.save();
    
    res.json(debate);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST api/debates/:id/transcript
// @desc    Save debate transcript
// @access  Private
exports.saveTranscript = async (req, res) => {
  const { transcript } = req.body;
  
  try {
    const debate = await Debate.findById(req.params.id);
    
    if (!debate) {
      return res.status(404).json({ msg: 'Debate not found' });
    }

    // Check if user is a participant or creator
    const isCreator = debate.createdBy.toString() === req.user.id;
    const isParticipant = debate.participants.some(p => p.user.toString() === req.user.id);
    
    if (!isCreator && !isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    debate.transcript = transcript;
    await debate.save();
    
    res.json(debate);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Debate not found' });
    }
    res.status(500).send('Server error');
  }
};