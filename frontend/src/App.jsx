import { useEffect, useRef, useState } from 'react';
import { SCENARIOS, generateAIResponse } from './engine.js';

function BrandMark() {
  return (
    <svg className="brand-icon" viewBox="0 0 48 48" aria-hidden="true" fill="none">
      <circle cx="24" cy="24" r="21" stroke="#111111" strokeWidth="4" fill="#FFFFFF" />
      <path d="M16 18C16 14.6863 18.6863 12 22 12H26C29.3137 12 32 14.6863 32 18V24C32 27.3137 29.3137 30 26 30H22L16 36V18Z" fill="#006B5B" stroke="#111111" strokeWidth="2" />
      <circle cx="21" cy="20" r="2.5" fill="#FFFFFF" />
      <circle cx="27" cy="20" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

function Header({ onHome, onSettings, onGuide }) {
  return (
    <header role="banner">
      <button className="brand-group" type="button" aria-label="Kioo Companion Home" onClick={onHome}>
        <BrandMark />
        <span className="brand-copy">
          <span className="brand-name">KIOO COMPANION</span>
          <span className="helper-text brand-subtitle">Nairobi Voice Rehearsal</span>
        </span>
      </button>

      <div className="header-controls">
        <button type="button" className="btn btn-white" aria-haspopup="dialog" aria-expanded="false" onClick={onSettings}>
          <span aria-hidden="true">⚙️</span> Accessibility Settings
        </button>
        <button type="button" className="btn btn-white" aria-haspopup="dialog" aria-expanded="false" onClick={onGuide}>
          <span aria-hidden="true">ℹ️</span> How It Works
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer role="contentinfo">
      <p className="footer-title">Kioo Companion • AI for Accessibility Hackathon Prototype</p>
      <p className="helper-text footer-subtitle">Empowering confidence through self-paced virtual social rehearsal in Nairobi.</p>
    </footer>
  );
}

function Mascot() {
  return (
    <div className="mascot-container" aria-hidden="true">
      <svg className="mascot-svg" viewBox="0 0 120 120" fill="none">
        <path d="M60 22V8M60 8C63.3137 8 66 5.31371 66 2C66 -1.31371 63.3137 -4 60 -4C56.6863 -4 54 -1.31371 54 2C54 5.31371 56.6863 8 60 8Z" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
        <g>
          <circle cx="16" cy="60" r="12" fill="#006B5B" stroke="#111111" strokeWidth="3" />
          <circle cx="104" cy="60" r="12" fill="#006B5B" stroke="#111111" strokeWidth="3" />
        </g>
        <rect x="22" y="24" width="76" height="74" rx="28" fill="#FFFFFF" stroke="#111111" strokeWidth="4" />
        <circle cx="44" cy="54" r="7" fill="#111111" />
        <circle cx="76" cy="54" r="7" fill="#111111" />
        <circle cx="42" cy="52" r="2.5" fill="#FFFFFF" />
        <circle cx="74" cy="52" r="2.5" fill="#FFFFFF" />
        <circle cx="34" cy="68" r="5" fill="#C62828" opacity="0.8" />
        <circle cx="86" cy="68" r="5" fill="#C62828" opacity="0.8" />
        <path d="M48 72 Q60 84 72 72" stroke="#111111" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

function WelcomeScreen({ onStart, onSettings, onGuide }) {
  return (
    <section id="screen-welcome" className="screen" aria-labelledby="welcome-title">
      <div className="card center-text">
        <Mascot />
        <h1 id="welcome-title">Practise Conversations. Build Confidence.</h1>
        <p className="welcome-lead">Go at your own pace. Exit whenever you choose.</p>
        <p className="welcome-intro">
          Kioo Companion helps you rehearse everyday conversations in Nairobi before encountering them in real life.
          Speak aloud with a supportive companion, explore different situations, and take as much time as you need.
        </p>
        <div className="welcome-actions">
          <button type="button" className="btn btn-teal btn-start" onClick={onStart}>
            Start Practising Now <span aria-hidden="true">→</span>
          </button>
          <div className="welcome-secondary-actions">
            <button type="button" className="btn btn-white" onClick={onSettings}>⚙️ Customise Accessibility</button>
            <button type="button" className="btn btn-white" onClick={onGuide}>💡 How It Works</button>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card promise-card">
          <h2>🛡️ Safe &amp; Predictable</h2>
          <p>No unexpected test scoring, no rankings, and no ticking countdown clocks. You have unlimited time to respond.</p>
        </div>
        <div className="card promise-card">
          <h2>🛑 Always In Control</h2>
          <p>Pause, repeat what was said, or exit immediately whenever you feel like taking a break. You set the pace.</p>
        </div>
      </div>
    </section>
  );
}

const scenarios = [
  {
    key: 'hospital',
    icon: '🏥',
    title: 'Hospital Reception',
    description: 'Practise explaining why you are visiting, answering receptionist questions, confirming appointments, and asking for clear clinic directions.',
    button: 'Practise Hospital Reception →',
  },
  {
    key: 'matatu',
    icon: '🚐',
    title: 'Matatu Stage',
    description: 'Practise asking conductors about boarding points, confirming exact fares to your stage, requesting clear drops, and dealing with bustling stages.',
    button: 'Practise Matatu Stage →',
  },
  {
    key: 'government',
    icon: '🏛️',
    title: 'Government Service Office',
    description: 'Practise visiting Huduma Centre or a municipal desk: asking about required documentation, identifying the right queue counter, and clarifying steps.',
    button: 'Practise Government Office →',
  },
  {
    key: 'directions',
    icon: '🧭',
    title: 'Asking for Directions',
    description: 'Practise asking a passerby for directions in Nairobi, requesting specific visual landmarks, confirming left or right turns, and asking them to repeat.',
    button: 'Practise Asking for Directions →',
  },
];

function ScenarioScreen({ onHome, onSelect }) {
  return (
    <section id="screen-scenarios" className="screen" aria-labelledby="scenarios-title">
      <div className="screen-back">
        <button type="button" className="btn btn-white" onClick={onHome}>← Back to Home</button>
      </div>
      <h1 id="scenarios-title">Choose a Conversation Situation</h1>
      <p className="scenario-intro">Select an interaction you would like to practise rehearsing today:</p>
      <div className="grid-2" role="list">
        {scenarios.map((scenario) => (
          <article className="card scenario-card" role="listitem" key={scenario.key}>
            <div>
              <div className="scenario-icon" aria-hidden="true">{scenario.icon}</div>
              <h2>{scenario.title}</h2>
              <p className="scenario-description">{scenario.description}</p>
            </div>
            <button type="button" className="btn btn-teal scenario-button" onClick={() => onSelect(scenario.key)}>
              {scenario.button}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

const levels = [
  {
    number: 1,
    title: 'Easy Start',
    badge: 'Calm & Predictable',
    description: 'One companion, short simple sentences, one question at a time, no interruptions, unlimited time, and ready-to-use suggested hints.',
    border: 'teal',
  },
  {
    number: 2,
    title: 'Everyday Practice',
    badge: 'Natural Conversation',
    description: 'Realistic everyday back-and-forth flow, standard follow-up questions, and slightly longer spoken sentences with zero pressure.',
    border: 'teal',
  },
  {
    number: 3,
    title: 'Handling Changes',
    badge: 'Gentle Variations',
    description: 'Practise realistic minor surprises (e.g. room room reassignment, fare changes, missing documents). Safe rehearsal to handle slight uncertainty.',
    border: 'red',
  },
  {
    number: 4,
    title: 'Busy Environment',
    badge: 'Multi-Character Interaction',
    description: 'Simulates two characters (such as receptionist plus someone asking about the queue line, or conductor and fellow passenger). Speakers are clearly identified.',
    border: 'black',
  },
];

const speakerNames = {
  hospital: 'Receptionist Joy',
  matatu: 'Conductor Otieno',
  government: 'Customer Officer Wanjiku',
  directions: 'Passerby Maina',
};

const conversationOpenings = {
  hospital: {
    1: ['Good morning. Welcome to Nairobi Hospital. How can I help you today?', ['I have an appointment.', 'I am visiting Dr. Kamau.', 'Where is the registration desk?']],
    2: ['Habari, welcome. Are you here for a scheduled clinic appointment or walk-in consultation?', ['I have a scheduled clinic appointment.', 'I need a walk-in consultation.', "I'm not sure which one."]],
    3: ["Good morning. I see your file here, but Dr. Otieno's consultation room has just moved to Wing C on the second floor.", ['How do I get to Wing C?', 'Is there an elevator?', 'Will my appointment time change?']],
    4: ['Good morning. Welcome to Nairobi Hospital. Please let me know who you are checking in for.', ['I am checking in for myself.', 'I have an appointment with Dr. Kamau.']],
  },
  matatu: {
    1: ['Sasa! Westlands direct. One seat left at the front. Are you boarding?', ['Yes, how much is the fare?', 'Does this matatu pass Safaricom house?', 'No, I need another stage.']],
    2: ['Nairobi CBD, Commercial! Where are you alighting along the highway?', ['I am alighting at Museum Hill.', 'I am going all the way to Commercial.', 'Does this bus stop at Ngara?']],
    3: ['Board quickly, boss! But just a heads up: due to roadworks on Uhuru Highway, we are diverting via Riverside.', ['Does the diversion still reach Westlands?', 'How long will the diversion take?', 'I might need to take another vehicle.']],
    4: ['Commercial! Two passengers needed. Step inside brother!', ['Is this vehicle full?', 'How much to town?']],
  },
  government: {
    1: ['Welcome to Huduma Centre. Which public service are you looking to receive today?', ['I need to renew my National ID.', 'I need a certificate of good conduct.', 'I need help finding the right desk.']],
    2: ['Good afternoon. Please state the service you require and whether you made an eCitizen booking.', ['I have an eCitizen booking invoice.', "I haven't booked online yet.", 'Could you explain the process?']],
    3: ['Welcome. Our automated queuing system is temporarily undergoing maintenance, so we are calling names manually.', ["How will I know when it's my turn?", 'Where should I wait?', 'Is the wait time longer?']],
    4: ['Good morning. Please check in with your documents.', ['Good morning, I have my papers here.', 'I need assistance with my form.']],
  },
  directions: {
    1: ["Habari! You look like you're searching for something. Which building are you trying to find?", ['I am looking for the National Archives.', 'Where is Kencom House?', 'I am trying to find Moi Avenue.']],
    2: ['Hello there. Can I help point you in the right direction?', ['Yes please, I am looking for the post office.', 'How do I get to Kenyatta Avenue?', 'Is the supermarket nearby?']],
    3: ['Hello! If you are heading towards City Hall, please note that the main road is closed for a public marathon event.', ['Which alternative walking path is open?', 'Can I walk through the parliament gardens?', 'How do I get around it?']],
    4: ['Hello! Are you looking for the bus stop or the train terminal?', ['I am looking for the train terminal.', 'I am looking for the bus station.']],
  },
};

function DifficultyScreen({ scenario, onBack, onSelect }) {
  return (
    <section id="screen-difficulty" className="screen" aria-labelledby="difficulty-title">
      <div className="screen-back">
        <button type="button" className="btn btn-white" onClick={onBack}>← Back to Scenarios</button>
      </div>
      <div className="selected-scenario-wrap">
        <span className="badge badge-teal">Scenario: {scenario.title}</span>
      </div>
      <h1 id="difficulty-title">Select Practice Level</h1>
      <p className="difficulty-intro">Every level is unlocked. Choose whatever feels right for you today. You can adjust this anytime during conversation.</p>
      <div className="difficulty-list" role="list">
        {levels.map((level) => (
          <div className={`card level-card level-${level.border}`} role="listitem" key={level.number}>
            <div className="level-heading">
              <h2>Level {level.number}: {level.title}</h2>
              <span className={`badge badge-${level.border}`}>{level.badge}</span>
            </div>
            <p className="level-description">{level.description}</p>
            <button type="button" className="btn btn-teal" onClick={() => onSelect(level.number)}>
              Start Level {level.number}: {level.title} →
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConversationScreen({ scenario, level, preferences, onChangeLevel, onEnd }) {
  const [transcript, setTranscript] = useState('');
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('Tap microphone below to respond');
  const levelData = SCENARIOS[scenario.key].levels[level];
  const [currentMessage, setCurrentMessage] = useState(levelData.opening);
  const [currentSpeaker, setCurrentSpeaker] = useState(SCENARIOS[scenario.key].speakers.primary);
  const [currentHints, setCurrentHints] = useState(levelData.hints);
  const [conversationTurn, setConversationTurn] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const selectedVoiceRef = useRef(null);
  const levelTitle = levels.find((item) => item.number === level)?.title ?? 'Easy Start';

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(Recognition));
    setSynthesisSupported('speechSynthesis' in window);

    if (!Recognition) return undefined;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-KE';
    recognition.onstart = () => {
      setListening(true);
      setStatus("Listening... Speak when you're ready.");
    };
    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) finalTranscript += event.results[index][0].transcript;
        else interimTranscript += event.results[index][0].transcript;
      }
      if (finalTranscript) setTranscript((value) => `${value ? `${value} ` : ''}${finalTranscript}`);
      if (interimTranscript) setStatus(`Listening: "${interimTranscript}"...`);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'not-allowed') setStatus('Microphone access blocked. You can type your reply below.');
      else if (event.error === 'no-speech') setStatus('No speech heard. Tap microphone to try again or type below.');
      else setStatus(`Microphone unavailable (${event.error}). You can type below.`);
    };
    recognition.onend = () => {
      setListening(false);
      if (!speaking && !paused) setStatus('Tap microphone to speak or click "Send Response"');
    };
    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch { /* Recognition may not have started. */ }
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      selectedVoiceRef.current = voices.find((voice) => voice.lang === 'en-KE' || voice.lang.includes('KE'))
        ?? voices.find((voice) => voice.lang.startsWith('en-'))
        ?? null;
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const stopAISpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speakAIResponse = (text) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoiceRef.current;
    utterance.rate = Number(preferences.speechSpeed) || 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => { setSpeaking(true); setStatus('Your companion is speaking aloud...'); };
    utterance.onend = () => { setSpeaking(false); if (!paused) setStatus('Tap microphone to reply when you are ready.'); };
    utterance.onerror = () => { setSpeaking(false); setStatus('Ready for your response.'); };
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (synthesisSupported) {
      const timer = window.setTimeout(() => speakAIResponse(currentMessage), 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentMessage, synthesisSupported]);

  const focusForTypedFallback = () => {
    document.getElementById('user-speech-input')?.focus();
    setStatus('Please type your response in the box below.');
  };

  const toggleMicrophone = () => {
    if (paused) {
      setStatus('Conversation is paused. Click Resume first.');
      return;
    }
    if (speaking) stopAISpeech();
    if (!speechSupported || !recognitionRef.current) {
      focusForTypedFallback();
      return;
    }
    if (listening) {
      try { recognitionRef.current.stop(); } catch { /* Recognition may already be ending. */ }
      setListening(false);
    } else {
      try { recognitionRef.current.start(); } catch { setStatus('Microphone is already active.'); }
    }
  };

  const submitUserResponse = async () => {
    const text = transcript.trim();
    if (!text) {
      setStatus('Please speak into the microphone or type a reply first.');
      return;
    }

    const nextHistory = [...conversationHistory, { sender: 'user', text }];
    if (listening) {
      try { recognitionRef.current?.stop(); } catch { /* Recognition may already be ending. */ }
      setListening(false);
    }
    stopAISpeech();
    setConversationHistory(nextHistory);
    setTranscript('');
    setStatus('Preparing a response...');
    const response = await generateAIResponse(text, nextHistory, scenario.key, level, conversationTurn);
    setConversationTurn((turn) => turn + 1);
    setCurrentSpeaker(response.speaker || SCENARIOS[scenario.key].speakers.primary);
    setCurrentMessage(response.text);
    setCurrentHints(response.hints || []);
    setConversationHistory((history) => [...history, { sender: response.speaker, text: response.text }]);
    setStatus('Tap microphone to reply when you are ready.');
  };

  const restartScenario = () => {
    setTranscript('');
    setPaused(false);
    setStatus('Tap microphone below to respond');
    setCurrentSpeaker(SCENARIOS[scenario.key].speakers.primary);
    setCurrentMessage(levelData.opening);
    setCurrentHints(levelData.hints);
    setConversationTurn(0);
    setConversationHistory([]);
  };

  const finishPractice = () => {
    const phrases = conversationHistory.filter((entry) => entry.sender === 'user').map((entry) => entry.text).slice(-3);
    onEnd({
      turns: conversationHistory.length,
      phrases: phrases.length > 0 ? phrases : ['Listened to scenario opening dialogue and instructions.'],
    });
  };

  const togglePause = () => {
    if (!paused) {
      if (listening) {
        try { recognitionRef.current?.stop(); } catch { /* Recognition may already be ending. */ }
        setListening(false);
      }
      stopAISpeech();
      setPaused(true);
      setStatus('Conversation paused. Take your time.');
    } else {
      setPaused(false);
      setStatus('Conversation resumed. Tap microphone when ready.');
    }
  };

  return (
    <section id="screen-conversation" className="screen" aria-labelledby="conversation-header-info">
      <div className="card conversation-hud">
        <div className="hud-inner">
          <div id="conversation-header-info" className="hud-badges">
            <span className="badge badge-teal">{scenario.title}</span>
            <span className="badge badge-red">Level {level}: {levelTitle}</span>
          </div>
          <div className="hud-actions">
            <button type="button" className="btn btn-white btn-compact" onClick={onChangeLevel}>Change Level</button>
            <button type="button" className="btn btn-red btn-compact" onClick={finishPractice}>End Practice 🛑</button>
          </div>
        </div>
      </div>

      <div className="conversation-stage">
        <div className="dialogue-card">
          <Mascot />
          <div className="speaker-meta">
            <div>
              <span className="helper-text speaker-label">Speaking Now:</span>
              <span className="badge badge-black speaker-badge">{currentSpeaker}</span>
            </div>
            <button type="button" className="btn btn-white btn-compact" onClick={() => speakAIResponse(currentMessage)} aria-label="Repeat what the companion just said aloud">
              🔊 Repeat Message
            </button>
          </div>
          <div className="ai-speech-bubble" tabIndex="0" aria-live="polite">&quot;{currentMessage}&quot;</div>
          <div className="status-strip" role="status">
            <span className="status-dot" />
            <span>{paused ? 'Conversation paused. Take your time.' : status}</span>
          </div>
          <div className="hints-container">
            <div className="hints-heading">
              <span className="hints-title">💡 Suggested ideas to say:</span>
              <span className="helper-text">(Tap any to populate input)</span>
            </div>
            <div className="hints-list">
              {currentHints.map((hint) => (
                <button type="button" className="hint-chip" key={hint} onClick={() => setTranscript(hint)}>{hint}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mic-button-wrapper">
          <button type="button" className={`btn ${listening ? 'btn-red' : 'btn-teal'} btn-mic`} onClick={toggleMicrophone} aria-pressed={listening}>
            <span aria-hidden="true">{listening ? '⏹️' : '🎙️'}</span><span>{listening ? 'Listening... Tap to Stop' : 'Tap to Speak'}</span>
          </button>
          <p className="helper-text mic-subtext">{speechSupported ? 'Take your time. There is no rush or time limit.' : 'Spoken microphone recognition is not supported by your current browser. You can type your response below.'}</p>
        </div>

        <div className="transcript-box">
          <label htmlFor="user-speech-input">Your Spoken Response (You can review, edit or type directly):</label>
          <textarea id="user-speech-input" className="transcript-input" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Your words will appear here as you speak, or you can type here anytime..." />
          <div className="transcript-actions">
            <button type="button" className="btn btn-white" onClick={() => setTranscript('')}>Clear Text</button>
            <button type="button" className="btn btn-teal" onClick={submitUserResponse}>Send Response 💬</button>
          </div>
        </div>

        <div className="action-controls-grid">
          <button type="button" className={`btn ${paused ? 'btn-teal' : 'btn-white'}`} onClick={togglePause}>{paused ? '▶️ Resume Conversation' : '⏸️ Pause Conversation'}</button>
          <button type="button" className="btn btn-white" onClick={restartScenario}>Restart Scenario</button>
          <button type="button" className="btn btn-red" onClick={finishPractice}>Finish / Exit</button>
        </div>
      </div>
    </section>
  );
}

function SummaryScreen({ scenario, level, summary, onPractiseAgain, onLevel, onScenario, onHome }) {
  const levelTitle = levels.find((item) => item.number === level)?.title ?? 'Easy Start';

  return (
    <section id="screen-summary" className="screen" aria-labelledby="summary-title">
      <div className="card center-text summary-card">
        <div className="completion-illustration" aria-hidden="true">🌱</div>
        <h1 id="summary-title">Rehearsal Completed!</h1>
        <p className="summary-lead">Well done on taking the time to practise today.</p>
        <div className="summary-badges">
          <span className="badge badge-teal">{scenario.title}</span>
          <span className="badge badge-black">Level {level}: {levelTitle}</span>
          <span className="badge badge-white">{summary.turns} Exchanges Recorded</span>
        </div>
        <div className="phrases-card">
          <h2>✨ Useful Phrases Practised:</h2>
          <ul>{summary.phrases.map((phrase) => <li key={phrase}>&quot;{phrase}&quot;</li>)}</ul>
        </div>
        <p className="summary-message">Remember: Conversation is a skill that develops at your own pace. You can practise again whenever you are ready.</p>
        <div className="summary-actions">
          <button type="button" className="btn btn-teal" onClick={onPractiseAgain}>Practise This Scenario Again 🔄</button>
          <button type="button" className="btn btn-white" onClick={onLevel}>Try Another Level 🎚️</button>
          <button type="button" className="btn btn-white" onClick={onScenario}>Choose Another Scenario 🗺️</button>
          <button type="button" className="btn btn-black" onClick={onHome}>Return to Home 🏠</button>
        </div>
      </div>
    </section>
  );
}

const defaultPreferences = {
  textSize: 'normal',
  speechSpeed: 1.0,
  enhancedContrast: false,
  reduceMotion: false,
  showHints: true,
  showTranscript: true,
  soundEffects: false,
};

function AccessibilityModal({ preferences, onChange, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
      <div className="modal-content">
        <div className="modal-heading">
          <h2 id="settings-dialog-title">⚙️ Accessibility Preferences</h2>
          <button ref={closeButtonRef} type="button" className="btn btn-white btn-compact" onClick={onClose} aria-label="Close Settings">✕ Close</button>
        </div>
        <fieldset className="settings-group">
          <legend>Text Size</legend>
          <div className="radio-pill-group">
            {[['normal', 'Standard (20px)'], ['large', 'Large (23px)'], ['xlarge', 'Extra Large (26px)']].map(([value, label]) => (
              <label className="radio-pill-label" key={value}>
                <input type="radio" name="pref-text-size" value={value} checked={preferences.textSize === value} onChange={() => onChange('textSize', value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="settings-group">
          <legend>AI Spoken Speed</legend>
          <div className="radio-pill-group">
            {[[0.8, 'Slow & Clear'], [1.0, 'Normal Speed'], [1.2, 'Faster']].map(([value, label]) => (
              <label className="radio-pill-label" key={value}>
                <input type="radio" name="pref-speech-speed" value={value} checked={preferences.speechSpeed === value} onChange={() => onChange('speechSpeed', value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="settings-group">
          <legend>Visual Display &amp; Motion</legend>
          <div className="settings-checks">
            <label className="checkbox-label"><input type="checkbox" checked={preferences.enhancedContrast} onChange={(event) => onChange('enhancedContrast', event.target.checked)} />Enhanced High Contrast Borders</label>
            <label className="checkbox-label"><input type="checkbox" checked={preferences.reduceMotion} onChange={(event) => onChange('reduceMotion', event.target.checked)} />Reduce Animations (Calm Mode)</label>
          </div>
        </fieldset>
        <fieldset className="settings-group">
          <legend>Conversation Assistance</legend>
          <div className="settings-checks">
            <label className="checkbox-label"><input type="checkbox" checked={preferences.showHints} onChange={(event) => onChange('showHints', event.target.checked)} />Show Suggested Response Hints</label>
            <label className="checkbox-label"><input type="checkbox" checked={preferences.showTranscript} onChange={(event) => onChange('showTranscript', event.target.checked)} />Show Response Textarea &amp; Review Box</label>
            <label className="checkbox-label"><input type="checkbox" checked={preferences.soundEffects} onChange={(event) => onChange('soundEffects', event.target.checked)} />Enable Level 3/4 Ambient Stage Sounds (Default Off)</label>
          </div>
        </fieldset>
        <div className="integration-note">
          <p className="helper-text"><strong>💡 Preferences are automatically saved in local browser storage.</strong></p>
          <p className="helper-text integration-copy">Ready for future sync with the <a href="https://github.com/AI-for-Accessibility-Collective/AI-for-Accessibility-Toolkit" target="_blank" rel="noopener noreferrer">AI for Accessibility Toolkit</a>.</p>
        </div>
        <div className="modal-footer-action"><button type="button" className="btn btn-teal" onClick={onClose}>Done &amp; Save Preferences</button></div>
      </div>
    </div>
  );
}

function GuideModal({ onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guide-dialog-title">
      <div className="modal-content">
        <div className="modal-heading">
          <h2 id="guide-dialog-title">How Kioo Companion Works</h2>
          <button ref={closeButtonRef} type="button" className="btn btn-white btn-compact" onClick={onClose} aria-label="Close Guide">✕ Close</button>
        </div>
        <div className="guide-instructions">
          <p><strong>1. Listen:</strong> Your virtual companion speaks first with realistic dialogue tailored to Nairobi scenarios.</p>
          <p><strong>2. Respond:</strong> Press the big <em>Tap to Speak</em> button and talk naturally into your microphone. Or, if you prefer, type your reply in the text box.</p>
          <p><strong>3. Edit anytime:</strong> Your spoken words are transcribed in real-time. You can adjust the text before sending.</p>
          <p><strong>4. Unlimited time:</strong> Take all the time you need. If you need to step away, click <em>Pause Conversation</em>.</p>
          <p><strong>5. Exit whenever you choose:</strong> Hit <em>End Practice</em> at any moment. There are no penalties or failing marks.</p>
        </div>
        <div className="modal-footer-action"><button type="button" className="btn btn-teal" onClick={onClose}>Got It!</button></div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [selectedScenario, setSelectedScenario] = useState('hospital');
  const selectedScenarioData = scenarios.find(({ key }) => key === selectedScenario) ?? scenarios[0];
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [sessionSummary, setSessionSummary] = useState({ turns: 0, phrases: ['Listened to scenario opening dialogue and instructions.'] });
  const [preferences, setPreferences] = useState(() => {
    try {
      return { ...defaultPreferences, ...JSON.parse(localStorage.getItem('kioo_companion_prefs') ?? '{}') };
    } catch {
      return defaultPreferences;
    }
  });
  const [modal, setModal] = useState(null);

  useEffect(() => {
    localStorage.setItem('kioo_companion_prefs', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!modal) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setModal(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [modal]);

  const updatePreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));

  const selectScenario = (scenarioKey) => {
    setSelectedScenario(scenarioKey);
    setScreen('difficulty');
  };

  const selectLevel = (levelNumber) => {
    setSelectedLevel(levelNumber);
    setSessionSummary({ turns: 0, phrases: ['Listened to scenario opening dialogue and instructions.'] });
    setScreen('conversation');
  };

  return (
    <div className={`app-shell text-${preferences.textSize} ${preferences.enhancedContrast ? 'enhanced-contrast' : ''} ${preferences.reduceMotion ? 'reduce-motion' : ''}`}>
      <Header onHome={() => setScreen('welcome')} onSettings={() => setModal('settings')} onGuide={() => setModal('guide')} />
      <main id="app-main" role="main" aria-live="polite">
        {screen === 'welcome' && <WelcomeScreen onStart={() => setScreen('scenarios')} onSettings={() => setModal('settings')} onGuide={() => setModal('guide')} />}
        {screen === 'scenarios' && (
          <ScenarioScreen
            onHome={() => setScreen('welcome')}
            onSelect={selectScenario}
          />
        )}
        {screen === 'difficulty' && (
          <DifficultyScreen
            scenario={selectedScenarioData}
            onBack={() => setScreen('scenarios')}
            onSelect={selectLevel}
          />
        )}
        {screen === 'conversation' && (
          <ConversationScreen
            scenario={selectedScenarioData}
            level={selectedLevel}
            preferences={preferences}
            onChangeLevel={() => setScreen('difficulty')}
            onEnd={(summary) => { setSessionSummary(summary); setScreen('summary'); }}
          />
        )}
        {screen === 'summary' && (
          <SummaryScreen
            scenario={selectedScenarioData}
            level={selectedLevel}
            summary={sessionSummary}
            onPractiseAgain={() => { setSessionSummary({ turns: 0, phrases: ['Listened to scenario opening dialogue and instructions.'] }); setScreen('conversation'); }}
            onLevel={() => setScreen('difficulty')}
            onScenario={() => setScreen('scenarios')}
            onHome={() => setScreen('welcome')}
          />
        )}
      </main>
      <Footer />
      {modal === 'settings' && <AccessibilityModal preferences={preferences} onChange={updatePreference} onClose={() => setModal(null)} />}
      {modal === 'guide' && <GuideModal onClose={() => setModal(null)} />}
    </div>
  );
}
