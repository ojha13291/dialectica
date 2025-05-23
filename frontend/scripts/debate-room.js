document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Get debate ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const debateId = urlParams.get('id');
    
    if (!debateId) {
        showNotification('Debate ID is missing', 'error');
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 3000);
        return;
    }

    // DOM Elements
    const startDebateBtn = document.getElementById('startDebateBtn');
    const micToggle = document.getElementById('micToggle');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const progressBar = document.querySelector('.progress-bar');
    const currentSpeakerEl = document.querySelector('.current-speaker');
    const debateTitleEl = document.querySelector('.debate-title');
    const debateTopicEl = document.querySelector('.debate-topic');
    const forSpeechArea = document.querySelector('.debater-card.for-motion .speech-text-area');
    const againstSpeechArea = document.querySelector('.debater-card.against-motion .speech-text-area');
    const forMicStatus = document.querySelector('.debater-card.for-motion .mic-status');
    const againstMicStatus = document.querySelector('.debater-card.against-motion .mic-status');
    
    // State variables
    let debate = null;
    let currentUser = null;
    let userRole = null; // 'creator', 'participant', 'judge', 'audience'
    let userPosition = null; // 'for', 'against', 'moderator'
    let debateActive = false;
    let currentSpeakerSide = 'for'; // 'for' or 'against'
    let timer;
    let timeRemaining = 120; // 2 minutes in seconds
    let totalTime = 120;
    let recognitionActive = false;
    let recognition = null;
    let socket = null;
      // WebRTC variables
    let localStream = null;
    let peerConnections = {};
    let rtcConfiguration = {
        iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
            {
                urls: 'turn:numb.viagenie.ca',
                username: 'webrtc@live.com',
                credential: 'muazkh'
            }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all',
        encodedInsertableStreams: true // Enable E2EE support
    };

    // Bandwidth management
    let currentBitrate = 'high'; // 'low', 'medium', 'high'
    const bitrateSettings = {
        low: { maxBitrate: 250000, scaleResolutionDownBy: 4 },
        medium: { maxBitrate: 500000, scaleResolutionDownBy: 2 },
        high: { maxBitrate: 2500000, scaleResolutionDownBy: 1 }
    };

    // Network quality monitoring
    let networkStats = {
        packetsLost: 0,
        roundTripTime: 0,
        jitter: 0
    };

    // Media quality presets
    const videoQualityPresets = {
        high: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
        },
        medium: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 }
        },
        low: {
            width: { ideal: 320, max: 640 },
            height: { ideal: 240, max: 480 },
            frameRate: { ideal: 15, max: 24 }
        }
    };

    // Media control elements
    const micBtn = document.querySelector(`.mic-btn[data-position="${userPosition}"]`);
    const cameraBtn = document.querySelector(`.camera-btn[data-position="${userPosition}"]`);
    const localVideo = document.querySelector(`#${userPosition}Video`);
    
    // Initialize
    initializeDebateRoom();
    
    // Update user display in navigation
    function updateUserDisplay() {
        const userNameDisplay = document.getElementById('userNameDisplay');
        if (currentUser && currentUser.name) {
            userNameDisplay.textContent = currentUser.name;
        }
    }
    
    // Add logout functionality
    document.getElementById('logoutButton').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/frontend/pages/login.html';
    });

    // Functions
    
    // Initialize debate room
    async function initializeDebateRoom() {
        try {
            // Get current user
            currentUser = await API.auth.getCurrentUser(token);
            
            // Update user display
            updateUserDisplay();
            
            // Get debate details
            debate = await API.debates.getDebate(token, debateId);
            
            // Set up user role and position
            setupUserRole();
            
            // Update UI with debate info
            updateDebateInfo();
            
            // Initialize socket connection
            initializeSocket();
            
            // Setup speech recognition
            setupSpeechRecognition();
            
            // Set up event listeners
            setupEventListeners();
            
            // Update UI based on debate status
            updateUIForDebateStatus();
            
            // Initialize manage participants functionality
            const manageParticipantsBtn = document.getElementById('manageParticipantsBtn');
            const addParticipantForm = document.getElementById('addParticipantForm');
            const participantsList = document.getElementById('participantsList');
            const debateLinkInput = document.getElementById('debateLink');
            const copyLinkBtn = document.getElementById('copyLinkBtn');
            const participantsModal = new bootstrap.Modal(document.getElementById('manageParticipantsModal'));

            if (userRole === 'creator') {
                manageParticipantsBtn.style.display = 'block';
                
                // Show modal when clicking manage participants button
                manageParticipantsBtn.addEventListener('click', () => {
                    updateParticipantsList();
                    updateDebateLink();
                    participantsModal.show();
                });

                // Handle adding participants
                addParticipantForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('participantEmail').value;
                    const position = document.getElementById('participantPosition').value;

                    try {
                        await API.debates.addParticipant(token, debateId, { email, position });
                        showNotification('Participant invited successfully', 'success');
                        document.getElementById('participantEmail').value = '';
                        updateParticipantsList();
                    } catch (error) {
                        showNotification(error.message, 'error');
                    }
                });

                // Handle copying debate link
                copyLinkBtn.addEventListener('click', () => {
                    debateLinkInput.select();
                    document.execCommand('copy');
                    showNotification('Link copied to clipboard', 'success');
                });
            } else {
                manageParticipantsBtn.style.display = 'none';
            }

            // Update participants list in modal
            function updateParticipantsList() {
                const forParticipant = debate.participants.find(p => p.position === 'for');
                const againstParticipant = debate.participants.find(p => p.position === 'against');

                let html = '';
                
                if (forParticipant) {
                    html += `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <strong>For:</strong> ${forParticipant.user.name} (${forParticipant.user.email})
                            </div>
                            <button class="btn btn-sm btn-outline-danger" onclick="removeParticipant('${forParticipant.user._id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;
                } else {
                    html += '<div class="mb-2"><strong>For:</strong> <em>Position available</em></div>';
                }

                if (againstParticipant) {
                    html += `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <strong>Against:</strong> ${againstParticipant.user.name} (${againstParticipant.user.email})
                            </div>
                            <button class="btn btn-sm btn-outline-danger" onclick="removeParticipant('${againstParticipant.user._id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;
                } else {
                    html += '<div class="mb-2"><strong>Against:</strong> <em>Position available</em></div>';
                }

                participantsList.innerHTML = html;
            }

            // Update debate link in modal
            function updateDebateLink() {
                const link = `${window.location.origin}/frontend/pages/debate.html?id=${debateId}`;
                debateLinkInput.value = link;
            }

            // Remove participant
            window.removeParticipant = async function(userId) {
                try {
                    await API.debates.removeParticipant(token, debateId, userId);
                    showNotification('Participant removed successfully', 'success');
                    debate = await API.debates.getDebate(token, debateId);
                    updateParticipantsList();
                    updateDebateInfo();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
            
        } catch (error) {
            showNotification(error.message, 'error');
            console.error('Initialization error:', error);
        }
    }
    
    // Set up user role and position
    function setupUserRole() {
        // Check if user is creator
        if (debate.createdBy._id === currentUser._id) {
            userRole = 'creator';
        } 
        // Check if user is participant
        else {
            const participant = debate.participants.find(p => p.user._id === currentUser._id);
            if (participant) {
                userRole = 'participant';
                userPosition = participant.position;
            } 
            // Check if user is judge
            else if (debate.judges.some(j => j.user._id === currentUser._id)) {
                userRole = 'judge';
            } 
            // Default to audience
            else {
                userRole = 'audience';
            }
        }
        
        console.log('User role:', userRole);
        console.log('User position:', userPosition);
        
        // Initialize WebRTC for participants
        if (userRole === 'participant') {
            initializeWebRTC();
        }
    }
    
    // Update UI with debate info
    function updateDebateInfo() {
        debateTitleEl.textContent = debate.title;
        debateTopicEl.textContent = `Topic: "${debate.topic}"`;
        
        // Update participant info
        const forParticipant = debate.participants.find(p => p.position === 'for');
        const againstParticipant = debate.participants.find(p => p.position === 'against');
          const forNameEl = document.querySelector('.debater-card.for-motion .debater-details h3');
        const againstNameEl = document.querySelector('.debater-card.against-motion .debater-details h3');

        // Update names based on participants
        forNameEl.textContent = forParticipant ? forParticipant.user.name : 'Waiting for participant...';
        againstNameEl.textContent = againstParticipant ? againstParticipant.user.name : 'Waiting for participant...';
        
        // Set speech time limit
        totalTime = debate.speechTimeLimit || 120;
        timeRemaining = totalTime;
        updateTimerDisplay();
    }
      // Initialize socket connection
    function initializeSocket() {
        socket = io('http://localhost:5000', {
            withCredentials: true,
            transports: ['websocket']
        });
        
        // Join debate room
        socket.emit('joinDebate', debateId);
        
        // Socket event listeners
        socket.on('speechUpdate', handleSpeechUpdate);
        socket.on('timerUpdate', handleTimerUpdate);
        socket.on('speakerChange', handleSpeakerChange);
        socket.on('debateStatusChange', handleDebateStatusChange);
        socket.on('participantUpdate', handleParticipantUpdate);
        socket.on('user-joined', handleUserJoined);
        socket.on('webrtc-offer', handleWebRTCOffer);
        socket.on('webrtc-answer', handleWebRTCAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('user-left', handleUserLeft);
        socket.on('mediaStateChange', handleMediaStateChange);
        
        // Handle disconnection
        socket.on('disconnect', () => {
            showNotification('Connection lost. Trying to reconnect...', 'warning');
        });
        
        // Handle reconnection
        socket.on('connect', () => {
            if (socket.recovered) {
                showNotification('Reconnected to debate room', 'info');
            }
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Start/End debate button
        if (userRole === 'creator' || userRole === 'moderator') {
            startDebateBtn.addEventListener('click', toggleDebate);
        } else {
            startDebateBtn.style.display = 'none';
        }
        
        // Microphone toggle
        micToggle.addEventListener('change', function() {
            toggleMicrophone(this.checked);
        });
        
        // Disable mic toggle until debate starts
        micToggle.disabled = true;
    }
    
    // Update UI based on debate status
    function updateUIForDebateStatus() {
        if (debate.status === 'active') {
            debateActive = true;
            startDebateBtn.textContent = 'End Debate';
            startDebateBtn.classList.remove('btn-primary');
            startDebateBtn.classList.add('btn-danger');
            
            // Enable mic toggle for participants
            if (userRole === 'participant') {
                micToggle.disabled = false;
            }
            
            // Set current speaker
            // This would typically come from the server, but for now we'll default to 'for'
            currentSpeakerSide = 'for';
            currentSpeakerEl.textContent = 'Current Speaker: For the Motion';
            highlightCurrentSpeaker();
            
            // Start timer
            startDebateTimer();
        } else {
            debateActive = false;
            startDebateBtn.textContent = 'Start Debate';
            startDebateBtn.classList.remove('btn-danger');
            startDebateBtn.classList.add('btn-primary');
            
            // Disable microphone toggle
            micToggle.disabled = true;
        }
    }
    
    // Handle speech update from socket
    function handleSpeechUpdate(data) {
        const speechArea = data.position === 'for' ? forSpeechArea : againstSpeechArea;
        
        // Update speech text
        if (data.isFinal) {
            // For final results, add a new paragraph
            const paragraph = document.createElement('p');
            paragraph.textContent = data.text;
            
            // Clear placeholder text if it exists
            if (speechArea.querySelector('.placeholder-text')) {
                speechArea.innerHTML = '';
            }
            
            speechArea.appendChild(paragraph);
            
            // Scroll to the bottom of the speech area
            speechArea.scrollTop = speechArea.scrollHeight;
        } else {
            // For interim results, update the last paragraph or create a new one
            let lastParagraph = speechArea.querySelector('p:last-child');
            
            if (!lastParagraph || speechArea.querySelector('.placeholder-text')) {
                speechArea.innerHTML = '';
                lastParagraph = document.createElement('p');
                speechArea.appendChild(lastParagraph);
            }
            
            lastParagraph.textContent = data.text;
        }
    }
    
    // Handle timer update from socket
    function handleTimerUpdate(data) {
        timeRemaining = data.timeRemaining;
        updateTimerDisplay();
    }
    
    // Handle speaker change from socket
    function handleSpeakerChange(data) {
        currentSpeakerSide = data.currentSpeaker;
        currentSpeakerEl.textContent = `Current Speaker: ${currentSpeakerSide === 'for' ? 'For' : 'Against'} the Motion`;
        highlightCurrentSpeaker();
        
        // Turn off microphone if user is not the current speaker
        if (userPosition !== currentSpeakerSide) {
            micToggle.checked = false;
            toggleMicrophone(false);
        }
    }
    
    // Handle debate status change from socket
    function handleDebateStatusChange(data) {
        debate.status = data.status;
        updateUIForDebateStatus();
    }
    
    // Handle participant updates
    function handleParticipantUpdate(updatedDebate) {
        // Update local debate state
        debate = updatedDebate;
        
        // Update participant displays
        const forParticipant = debate.participants.find(p => p.position === 'for');
        const againstParticipant = debate.participants.find(p => p.position === 'against');

        const forNameEl = document.querySelector('.debater-card.for-motion .debater-details h3');
        const againstNameEl = document.querySelector('.debater-card.against-motion .debater-details h3');

        forNameEl.textContent = forParticipant ? forParticipant.user.name : 'Waiting for participant...';
        againstNameEl.textContent = againstParticipant ? againstParticipant.user.name : 'Waiting for participant...';
    }

    // Handle new user joining for WebRTC
    async function handleUserJoined({ userId, position }) {
        // Create peer connection for new user
        const peerConnection = await handlePeerConnection(userId);
        
        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
            offer,
            to: userId
        });
    }

    // Handle WebRTC offer
    async function handleWebRTCOffer({ offer, from }) {
        // Create peer connection for offering user
        const peerConnection = await handlePeerConnection(from);
        
        // Set remote description and create answer
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('webrtc-answer', {
            answer,
            to: from
        });
    }

    // Handle WebRTC answer
    async function handleWebRTCAnswer({ answer, from }) {
        const peerConnection = peerConnections[from];
        if (peerConnection) {
            await peerConnection.setRemoteDescription(answer);
        }
    }

    // Handle ICE candidate
    async function handleIceCandidate({ candidate, from }) {
        const peerConnection = peerConnections[from];
        if (peerConnection) {
            await peerConnection.addIceCandidate(candidate);
        }
    }

    // Handle user leaving
    function handleUserLeft({ userId }) {
        // Clean up peer connection
        if (peerConnections[userId]) {
            peerConnections[userId].close();
            delete peerConnections[userId];
        }
    }

    // Handle media state change
    function handleMediaStateChange({ position, type, enabled }) {
        if (position !== userPosition) {
            const mediaBtn = document.querySelector(`.${type}-btn[data-position="${position}"]`);
            if (mediaBtn) {
                mediaBtn.classList.toggle('active', enabled);
                const icon = mediaBtn.querySelector('i');
                if (type === 'audio') {
                    icon.className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
                } else {
                    icon.className = enabled ? 'fas fa-video' : 'fas fa-video-slash';
                }
            }
            
            if (type === 'video') {
                const placeholder = document.querySelector(`#${position}Video`).nextElementSibling;
                placeholder.style.display = enabled ? 'none' : 'flex';
            }
        }
    }

    // Toggle debate start/stop
    async function toggleDebate() {
        try {
            if (!debateActive) {
                // Check if we have both participants
                const hasForParticipant = debate.participants.some(p => p.position === 'for');
                const hasAgainstParticipant = debate.participants.some(p => p.position === 'against');
                
                if (!hasForParticipant || !hasAgainstParticipant) {
                    showNotification('Need both FOR and AGAINST participants to start the debate', 'error');
                    return;
                }
                
                // Start debate
                debate = await API.debates.startDebate(token, debateId);
                debateActive = true;
                updateUIForDebateStatus();
                showNotification('Debate started successfully', 'info');
            } else {
                // End debate
                debate = await API.debates.endDebate(token, debateId);
                debateActive = false;
                updateUIForDebateStatus();
                showNotification('Debate ended successfully', 'info');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    // Update timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        minutesEl.textContent = minutes.toString().padStart(2, '0');
        secondsEl.textContent = seconds.toString().padStart(2, '0');
        
        // Update progress bar
        const progressPercentage = (timeRemaining / totalTime) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        
        // Change color based on time remaining
        if (timeRemaining <= 30) {
            progressBar.className = 'progress-bar bg-danger';
        } else if (timeRemaining <= 60) {
            progressBar.className = 'progress-bar bg-warning';
        } else {
            progressBar.className = 'progress-bar bg-primary';
        }
    }
    
    // Start debate timer
    function startDebateTimer() {
        if (timer) clearInterval(timer);
        
        updateTimerDisplay();
        
        // Only the creator or moderator should control the timer
        if (userRole === 'creator' || userPosition === 'moderator') {
            timer = setInterval(() => {
                timeRemaining--;
                
                // Emit timer update to all clients
                socket.emit('timerUpdate', {
                    debateId,
                    timeRemaining,
                    currentSpeaker: currentSpeakerSide
                });
                
                if (timeRemaining <= 0) {
                    clearInterval(timer);
                    endSpeech();
                } else {
                    updateTimerDisplay();
                }
            }, 1000);
        }
    }
    
    // Highlight current speaker
    function highlightCurrentSpeaker() {
        document.querySelector('.debater-card.for-motion').classList.toggle('active-speaker', currentSpeakerSide === 'for');
        document.querySelector('.debater-card.against-motion').classList.toggle('active-speaker', currentSpeakerSide === 'against');
    }
    
    // End speech
    function endSpeech() {
        // Play sound alert
        playTimerEndSound();
        
        // Show time's up message
        showNotification("Time's up! Switching to the next speaker.", 'info');
        
        // Switch speaker
        switchSpeaker();
    }
    
    // Switch speaker
    function switchSpeaker() {
        currentSpeakerSide = currentSpeakerSide === 'for' ? 'against' : 'for';
        
        // Emit speaker change to all clients
        socket.emit('speakerChange', {
            debateId,
            currentSpeaker: currentSpeakerSide
        });
        
        // Reset timer
        timeRemaining = totalTime;
        
        // Emit timer update
        socket.emit('timerUpdate', {
            debateId,
            timeRemaining,
            currentSpeaker: currentSpeakerSide
        });
        
        // Start timer
        startDebateTimer();
    }
    
    // Toggle microphone
    function toggleMicrophone(isOn) {
        // Only allow current speaker to toggle microphone
        if (userPosition !== currentSpeakerSide && isOn) {
            showNotification('Only the current speaker can use the microphone', 'warning');
            micToggle.checked = false;
            return;
        }
        
        if (isOn) {
            // Update UI for active microphone
            if (userPosition === 'for') {
                forMicStatus.innerHTML = '<i class="fas fa-microphone"></i> Microphone active';
                forMicStatus.classList.add('mic-active');
            } else {
                againstMicStatus.innerHTML = '<i class="fas fa-microphone"></i> Microphone active';
                againstMicStatus.classList.add('mic-active');
            }
            
            // Start speech recognition if available
            if (recognition && recognition.available) {
                try {
                    recognition.start();
                    recognitionActive = true;
                } catch (e) {
                    console.error('Speech recognition error:', e);
                    showNotification('Could not start speech recognition', 'error');
                    micToggle.checked = false;
                }
            } else {
                showNotification('Speech recognition is not available in your browser', 'warning');
                micToggle.checked = false;
            }
        } else {
            // Update UI for inactive microphone
            forMicStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Microphone inactive';
            forMicStatus.classList.remove('mic-active');
            againstMicStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Microphone inactive';
            againstMicStatus.classList.remove('mic-active');
            
            // Stop speech recognition if it's active
            if (recognition && recognition.available && recognitionActive) {
                recognition.stop();
                recognitionActive = false;
            }
        }
    }
    
    // Setup speech recognition
    function setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.available = true;
            
            recognition.onresult = handleSpeechResult;
            
            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    showNotification('Microphone access denied. Please check your browser permissions.', 'error');
                    micToggle.checked = false;
                    toggleMicrophone(false);
                }
            };
            
            recognition.onend = function() {
                // Restart recognition if it was active but ended unexpectedly
                if (recognitionActive && debateActive) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error('Could not restart speech recognition:', e);
                        recognitionActive = false;
                    }
                }
            };
        } else {
            console.log('Speech recognition not supported in this browser.');
            recognition = { available: false };
            showNotification('Speech recognition is not supported in your browser', 'warning');
        }
    }
    
    // Handle speech recognition results
    function handleSpeechResult(event) {
        let transcript = '';
        let isFinal = false;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
            isFinal = event.results[i].isFinal;
        }
        
        if (transcript) {
            // Format the text with proper punctuation and capitalization
            transcript = formatSpeechText(transcript);
            
            // Update local speech text
            updateSpeechText(transcript, isFinal);
            
            // Emit speech update to other clients
            socket.emit('speechUpdate', {
                debateId,
                userId: currentUser._id,
                position: userPosition,
                text: transcript,
                isFinal
            });
            
            // If final, save to transcript
            if (isFinal && transcript.length > 5) {
                saveToTranscript(transcript);
            }
        }
    }
    
    // Update speech text area
    function updateSpeechText(text, isFinal) {
        const speechArea = userPosition === 'for' ? forSpeechArea : againstSpeechArea;
        
        if (isFinal) {
            // For final results, add a new paragraph
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            
            // Clear placeholder text if it exists
            if (speechArea.querySelector('.placeholder-text')) {
                speechArea.innerHTML = '';
            }
            
            speechArea.appendChild(paragraph);
            
            // Scroll to the bottom of the speech area
            speechArea.scrollTop = speechArea.scrollHeight;
        } else {
            // For interim results, update the last paragraph or create a new one
            let lastParagraph = speechArea.querySelector('p:last-child');
            
            if (!lastParagraph || speechArea.querySelector('.placeholder-text')) {
                speechArea.innerHTML = '';
                lastParagraph = document.createElement('p');
                speechArea.appendChild(lastParagraph);
            }
            
            lastParagraph.textContent = text;
        }
    }
    
    // Format speech text for better readability
    function formatSpeechText(text) {
        // Capitalize first letter
        text = text.trim();
        if (text.length > 0) {
            text = text.charAt(0).toUpperCase() + text.slice(1);
        }
        
        // Add period at the end if missing
        if (text.length > 0 && !['.',',','!','?',':',';'].includes(text.charAt(text.length - 1))) {
            text += '.';
        }
        
        return text;
    }
    
    // Save to transcript
    async function saveToTranscript(text) {
        // In a real implementation, you would accumulate the transcript and save it periodically
        // For now, we'll just log it
        console.log('Adding to transcript:', text);
        
        // In a full implementation:
        // debate.transcript = debate.transcript ? debate.transcript + '\n' + text : text;
        // await API.debates.saveTranscript(token, debateId, debate.transcript);
    }
    
    // Play timer end sound
    function playTimerEndSound() {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
        audio.play().catch(e => console.log('Could not play audio:', e));
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `debate-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
    
    // Add active speaker styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .debater-card.active-speaker {
            box-shadow: 0 0 0 3px var(--accent), 0 5px 15px rgba(0, 0, 0, 0.1);
            transform: translateY(-5px);
        }
        
        .mic-active {
            background-color: rgba(40, 167, 69, 0.1) !important;
            color: #28a745 !important;
        }
        
        .debate-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background-color: white;
            border-radius: 5px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.3s, transform 0.3s;
        }
        
        .debate-notification.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        .debate-notification.info {
            border-left: 4px solid var(--accent);
        }
        
        .debate-notification.warning {
            border-left: 4px solid var(--warning);
        }
        
        .debate-notification.error {
            border-left: 4px solid var(--danger);
        }
        
        .speech-text-area {
            max-height: 300px;
            overflow-y: auto;
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(23, 162, 184, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(23, 162, 184, 0); }
            100% { box-shadow: 0 0 0 0 rgba(23, 162, 184, 0); }
        }
        
        .debater-card.active-speaker .debater-avatar {
            animation: pulse 2s infinite;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Clean up when leaving the page
    window.addEventListener('beforeunload', () => {
        if (socket) {
            socket.emit('leaveDebate', debateId);
            socket.disconnect();
        }
        
        if (timer) {
            clearInterval(timer);
        }
        
        if (recognition && recognition.available && recognitionActive) {
            recognition.stop();
        }
    });
    
    // WebRTC functions
    
    // Initialize WebRTC    async function initializeWebRTC() {
        try {
            // Request permissions first
            const permissions = await Promise.all([
                navigator.permissions.query({ name: 'microphone' }),
                navigator.permissions.query({ name: 'camera' })
            ]);

            if (permissions.some(p => p.state === 'denied')) {
                throw new Error('Camera or microphone access denied');
            }

            // Get user media stream with both audio and video
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            });

            // Show local video stream
            if (localVideo) {
                localVideo.srcObject = localStream;
                await localVideo.play().catch(error => {
                    console.warn('Autoplay failed:', error);
                    showNotification('Click to start video', 'info');
                });
            }

            // Enable media control buttons
            if (micBtn) {
                micBtn.addEventListener('click', toggleMicrophone);
                micBtn.disabled = false;
            }
            if (cameraBtn) {
                cameraBtn.addEventListener('click', toggleCamera);
                cameraBtn.disabled = false;
            }

            // Initially mute audio and video
            toggleMicrophone(false);
            toggleCamera(false);

            // Set up media stream error handling
            localStream.getTracks().forEach(track => {
                track.onended = () => {
                    showNotification(`${track.kind} device disconnected`, 'warning');
                    if (track.kind === 'audio') {
                        micBtn.classList.remove('active');
                        micBtn.querySelector('i').className = 'fas fa-microphone-slash';
                    } else {
                        cameraBtn.classList.remove('active');
                        cameraBtn.querySelector('i').className = 'fas fa-video-slash';
                    }
                };
            });

        } catch (error) {
            console.error('Error accessing media devices:', error);
            let errorMessage = 'Could not access camera or microphone';
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Camera and microphone access denied. Please check your browser permissions.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera or microphone found. Please check your device connections.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera or microphone is already in use by another application.';
            }
            
            showNotification(errorMessage, 'error');
        }
    }

    // Toggle microphone
    function toggleMicrophone(forceState) {
        const shouldEnable = typeof forceState === 'boolean' ? forceState : !micBtn.classList.contains('active');
        
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = shouldEnable;
            });
        }

        micBtn.classList.toggle('active', shouldEnable);
        micBtn.querySelector('i').className = shouldEnable ? 'fas fa-microphone' : 'fas fa-microphone-slash';
        
        // Emit microphone state change to other participants
        socket.emit('mediaStateChange', {
            debateId,
            type: 'audio',
            enabled: shouldEnable,
            position: userPosition
        });
    }

    // Toggle camera
    function toggleCamera(forceState) {
        const shouldEnable = typeof forceState === 'boolean' ? forceState : !cameraBtn.classList.contains('active');
        
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = shouldEnable;
            });
        }

        cameraBtn.classList.toggle('active', shouldEnable);
        cameraBtn.querySelector('i').className = shouldEnable ? 'fas fa-video' : 'fas fa-video-slash';
        
        // Show/hide video placeholder
        const placeholder = document.querySelector(`#${userPosition}Video`).nextElementSibling;
        placeholder.style.display = shouldEnable ? 'none' : 'flex';
        
        // Emit camera state change to other participants
        socket.emit('mediaStateChange', {
            debateId,
            type: 'video',
            enabled: shouldEnable,
            position: userPosition
        });
    }

    // Handle peer connection
    async function handlePeerConnection(userId) {
        // Create new RTCPeerConnection
        const peerConnection = new RTCPeerConnection(rtcConfiguration);
        peerConnections[userId] = peerConnection;

        // Add local stream
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: userId
                });
            }
        };

        // Handle receiving remote stream
        peerConnection.ontrack = event => {
            const position = getPeerPosition(userId);
            if (position && position !== userPosition) {
                const remoteVideo = document.querySelector(`#${position}Video`);
                if (remoteVideo && !remoteVideo.srcObject) {
                    remoteVideo.srcObject = event.streams[0];
                }
            }
        };

        return peerConnection;
    }

    // Add to socket event listeners in initializeSocket()
    socket.on('user-joined', async ({ userId, position }) => {
        // Create peer connection for new user
        const peerConnection = await handlePeerConnection(userId);
        
        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
            offer,
            to: userId
        });
    });

    socket.on('webrtc-offer', async ({ offer, from }) => {
        // Create peer connection for offering user
        const peerConnection = await handlePeerConnection(from);
        
        // Set remote description and create answer
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('webrtc-answer', {
            answer,
            to: from
        });
    });

    socket.on('webrtc-answer', async ({ answer, from }) => {
        const peerConnection = peerConnections[from];
        if (peerConnection) {
            await peerConnection.setRemoteDescription(answer);
        }
    });

    socket.on('ice-candidate', async ({ candidate, from }) => {
        const peerConnection = peerConnections[from];
        if (peerConnection) {
            await peerConnection.addIceCandidate(candidate);
        }
    });

    socket.on('user-left', ({ userId }) => {
        // Clean up peer connection
        if (peerConnections[userId]) {
            peerConnections[userId].close();
            delete peerConnections[userId];
        }
    });

    socket.on('mediaStateChange', ({ position, type, enabled }) => {
        if (position !== userPosition) {
            const mediaBtn = document.querySelector(`.${type}-btn[data-position="${position}"]`);
            if (mediaBtn) {
                mediaBtn.classList.toggle('active', enabled);
                const icon = mediaBtn.querySelector('i');
                if (type === 'audio') {
                    icon.className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
                } else {
                    icon.className = enabled ? 'fas fa-video' : 'fas fa-video-slash';
                }
            }
            
            if (type === 'video') {
                const placeholder = document.querySelector(`#${position}Video`).nextElementSibling;
                placeholder.style.display = enabled ? 'none' : 'flex';
            }
        }
    });

    // Device selection and management
let availableDevices = {
    audioinput: [],
    videoinput: [],
    audiooutput: []
};

async function initializeDevices() {
    try {
        // Get list of available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Reset available devices
        availableDevices = {
            audioinput: [],
            videoinput: [],
            audiooutput: []
        };

        // Categorize devices
        devices.forEach(device => {
            if (availableDevices[device.kind]) {
                availableDevices[device.kind].push({
                    id: device.deviceId,
                    label: device.label || `${device.kind} ${availableDevices[device.kind].length + 1}`
                });
            }
        });

        // Create device selection UI
        updateDeviceSelectionUI();

    } catch (error) {
        console.error('Error initializing devices:', error);
        showNotification('Could not access media devices', 'error');
    }
}

// Update device selection UI
function updateDeviceSelectionUI() {
    const mediaControls = document.querySelector('.media-controls');
    if (!mediaControls) return;

    // Add device selection buttons if they don't exist
    if (!document.querySelector('.device-settings')) {
        const deviceSettings = document.createElement('div');
        deviceSettings.className = 'device-settings';
        deviceSettings.innerHTML = `
            <button class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#deviceSettingsModal">
                <i class="fas fa-cog"></i>
            </button>
            <div class="modal fade" id="deviceSettingsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Media Device Settings</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Microphone</label>
                                <select class="form-select" id="microphoneSelect">
                                    ${availableDevices.audioinput.map(device => 
                                        `<option value="${device.id}">${device.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Camera</label>
                                <select class="form-select" id="cameraSelect">
                                    ${availableDevices.videoinput.map(device => 
                                        `<option value="${device.id}">${device.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Speakers</label>
                                <select class="form-select" id="speakerSelect">
                                    ${availableDevices.audiooutput.map(device => 
                                        `<option value="${device.id}">${device.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        mediaControls.appendChild(deviceSettings);

        // Add event listeners for device selection
        document.getElementById('microphoneSelect')?.addEventListener('change', handleDeviceChange);
        document.getElementById('cameraSelect')?.addEventListener('change', handleDeviceChange);
        document.getElementById('speakerSelect')?.addEventListener('change', handleDeviceChange);
    }
}

// Handle device selection change
async function handleDeviceChange(event) {
    const deviceId = event.target.value;
    const deviceType = event.target.id.replace('Select', '');

    try {
        switch (deviceType) {
            case 'microphone':
            case 'camera':
                await updateMediaStream({
                    [deviceType === 'microphone' ? 'audio' : 'video']: { deviceId: { exact: deviceId } }
                });
                break;
            case 'speaker':
                if (typeof HTMLMediaElement.prototype.setSinkId === 'function') {
                    const elements = document.querySelectorAll('audio, video');
                    await Promise.all(Array.from(elements).map(el => el.setSinkId(deviceId)));
                }
                break;
        }
        showNotification(`${deviceType} changed successfully`, 'success');
    } catch (error) {
        console.error(`Error changing ${deviceType}:`, error);
        showNotification(`Could not change ${deviceType}`, 'error');
    }
}

// Update media stream with new constraints
async function updateMediaStream(constraints) {
    if (!localStream) return;

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            audio: constraints.audio || localStream.getAudioTracks().length > 0,
            video: constraints.video || localStream.getVideoTracks().length > 0
        });

        // Replace tracks in local stream
        const [audioTrack] = newStream.getAudioTracks();
        const [videoTrack] = newStream.getVideoTracks();

        if (audioTrack) {
            const oldAudioTrack = localStream.getAudioTracks()[0];
            if (oldAudioTrack) {
                localStream.removeTrack(oldAudioTrack);
                oldAudioTrack.stop();
            }
            localStream.addTrack(audioTrack);
        }

        if (videoTrack) {
            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) {
                localStream.removeTrack(oldVideoTrack);
                oldVideoTrack.stop();
            }
            localStream.addTrack(videoTrack);
        }

        // Update local video display
        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        // Replace tracks in all peer connections
        Object.values(peerConnections).forEach(pc => {
            pc.getSenders().forEach(sender => {
                if (sender.track.kind === 'audio' && audioTrack) {
                    sender.replaceTrack(audioTrack);
                }
                if (sender.track.kind === 'video' && videoTrack) {
                    sender.replaceTrack(videoTrack);
                }
            });
        });

    } catch (error) {
        console.error('Error updating media stream:', error);
        throw error;
    }
}
});