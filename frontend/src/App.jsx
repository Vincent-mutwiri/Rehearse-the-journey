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

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [selectedScenario, setSelectedScenario] = useState('hospital');

  const selectScenario = (scenarioKey) => {
    setSelectedScenario(scenarioKey);
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
      </main>
      <Footer />
    </div>
  );
}
