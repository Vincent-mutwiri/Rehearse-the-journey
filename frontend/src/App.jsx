import { useState } from 'react';

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

function Header({ onHome }) {
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
        <button type="button" className="btn btn-white" aria-haspopup="dialog" aria-expanded="false">
          <span aria-hidden="true">⚙️</span> Accessibility Settings
        </button>
        <button type="button" className="btn btn-white" aria-haspopup="dialog" aria-expanded="false">
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

function WelcomeScreen({ onStart }) {
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
            <button type="button" className="btn btn-white">⚙️ Customise Accessibility</button>
            <button type="button" className="btn btn-white">💡 How It Works</button>
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

function ConversationScreen({ scenario, level, onChangeLevel, onEnd }) {
  const [transcript, setTranscript] = useState('');
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('Tap microphone below to respond');
  const [opening, hints] = conversationOpenings[scenario.key][level];
  const levelTitle = levels.find((item) => item.number === level)?.title ?? 'Easy Start';

  const focusForTypedFallback = () => {
    document.getElementById('user-speech-input')?.focus();
    setStatus('Please type your response in the box below.');
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
            <button type="button" className="btn btn-red btn-compact" onClick={onEnd}>End Practice 🛑</button>
          </div>
        </div>
      </div>

      <div className="conversation-stage">
        <div className="dialogue-card">
          <Mascot />
          <div className="speaker-meta">
            <div>
              <span className="helper-text speaker-label">Speaking Now:</span>
              <span className="badge badge-black speaker-badge">{speakerNames[scenario.key]}</span>
            </div>
            <button type="button" className="btn btn-white btn-compact" aria-label="Repeat what the companion just said aloud">
              🔊 Repeat Message
            </button>
          </div>
          <div className="ai-speech-bubble" tabIndex="0" aria-live="polite">&quot;{opening}&quot;</div>
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
              {hints.map((hint) => (
                <button type="button" className="hint-chip" key={hint} onClick={() => setTranscript(hint)}>{hint}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mic-button-wrapper">
          <button type="button" className="btn btn-teal btn-mic" onClick={focusForTypedFallback}>
            <span aria-hidden="true">🎙️</span><span>Tap to Speak</span>
          </button>
          <p className="helper-text mic-subtext">Take your time. There is no rush or time limit.</p>
        </div>

        <div className="transcript-box">
          <label htmlFor="user-speech-input">Your Spoken Response (You can review, edit or type directly):</label>
          <textarea id="user-speech-input" className="transcript-input" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Your words will appear here as you speak, or you can type here anytime..." />
          <div className="transcript-actions">
            <button type="button" className="btn btn-white" onClick={() => setTranscript('')}>Clear Text</button>
            <button type="button" className="btn btn-teal" onClick={() => setStatus(transcript.trim() ? 'Preparing a response...' : 'Please speak into the microphone or type a reply first.')}>Send Response 💬</button>
          </div>
        </div>

        <div className="action-controls-grid">
          <button type="button" className={`btn ${paused ? 'btn-teal' : 'btn-white'}`} onClick={() => setPaused((value) => !value)}>{paused ? '▶️ Resume Conversation' : '⏸️ Pause Conversation'}</button>
          <button type="button" className="btn btn-white" onClick={() => setTranscript('')}>Restart Scenario</button>
          <button type="button" className="btn btn-red" onClick={onEnd}>Finish / Exit</button>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [selectedScenario, setSelectedScenario] = useState('hospital');
  const selectedScenarioData = scenarios.find(({ key }) => key === selectedScenario) ?? scenarios[0];
  const [selectedLevel, setSelectedLevel] = useState(1);

  const selectScenario = (scenarioKey) => {
    setSelectedScenario(scenarioKey);
    setScreen('difficulty');
  };

  const selectLevel = (levelNumber) => {
    setSelectedLevel(levelNumber);
    setScreen('conversation');
  };

  return (
    <div className="app-shell">
      <Header onHome={() => setScreen('welcome')} />
      <main id="app-main" role="main" aria-live="polite">
        {screen === 'welcome' && <WelcomeScreen onStart={() => setScreen('scenarios')} />}
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
            onChangeLevel={() => setScreen('difficulty')}
            onEnd={() => setScreen('difficulty')}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
