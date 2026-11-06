Pipecat: Real-Time Voice & Multimodal AI Agents
Pipecat is an open-source Python framework for building real-time voice and multimodal conversational agents. Build a single voice agent or a full multi-agent system where specialists hand off, fan out in parallel, and coordinate over a shared bus, locally or distributed across processes and machines. Orchestrate audio and video, AI services, transports, and conversation pipelines effortlessly, so you can focus on what makes your agents unique.

Want to dive right in? Run pipecat init quickstart or follow the quickstart guide.

🚀 What you can build
Voice Assistants – natural, streaming conversations with AI
Multi-Agent Systems – specialists that hand off, fan out in parallel, or run as sidecars over a shared bus
AI Companions – coaches, meeting assistants, characters
Multimodal Interfaces – voice, video, images, and more
Interactive Storytelling – creative tools with generative media
Business Agents – customer intake, support bots, guided flows
Complex Dialog Systems – design logic with structured conversations
🧠 Why Pipecat?
Voice-first: Integrates speech recognition, text-to-speech, and conversation handling
Pluggable: Supports many AI services and tools
Composable Pipelines: Build complex behavior from modular components
Multi-Agent Ready: Each pipeline is an agent. Compose them with handoff, parallel fan-out, sidecar workers, or distributed deployments
Real-Time: Ultra-low latency interaction with different transports (e.g. WebSockets or WebRTC)
🌐 Pipecat ecosystem
📱 Client SDKs
Building client applications? You can connect to Pipecat from any platform using our official SDKs:

JavaScript | React | React Native | Swift | Kotlin | C++ | ESP32

🧭 Structured conversations
Need predefined or dynamic conversation paths with state management? Pipecat Flows is built into Pipecat. Browse the examples to see it in action.

🪄 Beautiful UIs
Want to build beautiful and engaging experiences? Check out Pipecat UI, a shadcn registry of components for building voice AI applications. Browse the documentation for component previews and installation guides.

🛠️ Create and deploy projects
The Pipecat CLI ships with pipecat-ai — install it with uv tool install "pipecat-ai[cli]". Run pipecat init to start a project: it sets you up so an AI coding assistant (Claude Code, Codex) builds it for you, and can scaffold a runnable bot in under a minute. Then use the CLI to monitor and deploy your agent to production.

🔍 Debugging
Looking for help debugging your pipeline and processors? Check out Whisker, a real-time Pipecat debugger.

🖥️ Terminal
Love terminal applications? Check out Tail, a terminal dashboard for Pipecat.

🤖 Claude Code skills
Use Pipecat Skills with Claude Code to scaffold projects, deploy to Pipecat Cloud, and more. Install the marketplace with:

claude plugin marketplace add pipecat-ai/skills
and install any of the available plugins.

🧩 Community integrations
Build and share your own Pipecat service integrations! Browse existing community integrations or check out our guide to create your own.

📺️ Pipecat TV channel
Catch new features, interviews, and how-tos on our Pipecat TV channel.

🎬 See it in action
  
  

🧩 Available services
Category	Services
Speech-to-Text	AssemblyAI, AWS, Azure, Cartesia, Deepgram, ElevenLabs, Fal Wizper, FunASR, Gladia, Google, Gradium, Groq (Whisper), Meta, Mistral, Moonshine, NVIDIA, OpenAI (Whisper), Sarvam, Soniox, Speechmatics, Together, Whisper, xAI, Zoom
LLMs	Anthropic, AWS, Azure, Baseten, Cerebras, Crusoe, DeepSeek, Fireworks AI, Gemini, Grok, Groq, Inception, Mistral, Nebius, Novita, NVIDIA NIM, Ollama, OpenAI, OpenAI Responses, OpenRouter, Perplexity, Qwen, SambaNova, Sarvam, Smallest, Together AI
Text-to-Speech	AssemblyAI, Async, AWS, Azure, Bland, Camb AI, Cartesia, Deepgram, ElevenLabs, Fish, Google, Gradium, Groq, Inworld, Kokoro, MiniMax, Mistral, Neuphonic, NVIDIA, OpenAI, Piper, Resemble, Rime, Sarvam, Smallest, Soniox, Speechify, Speechmatics, Together, xAI, XTTS
Speech-to-Speech	AWS Nova Sonic, Azure Voice Live, Gemini Multimodal Live, Grok Voice Agent, OpenAI Realtime, Ultravox, Zoom AI Voice Agent
Transport	Daily (WebRTC), FastAPI Websocket, LiveKit (WebRTC), SmallWebRTCTransport, Vonage (WebRTC), WebSocket Server, WhatsApp, Local
Serializers	Exotel, Genesys, Plivo, Twilio, Telnyx, Vonage
Video	HeyGen, LemonSlice, Tavus, Simli
Memory	mem0
Vision & Image	fal, Google, Moondream
Audio Processing	Silero VAD, Krisp Viva, Koala, ai-coustics, RNNoise
Analytics & Metrics	OpenTelemetry, Sentry
Community	Browse community integrations →
📚 View full services documentation →

⚡ Getting started
Run Pipecat on your local machine, then move your agent processes to the cloud when you're ready. Either way, you'll need uv — install it first:

curl -LsSf https://astral.sh/uv/install.sh | sh
Start a new project with the CLI
The quickest path: install the Pipecat CLI and scaffold a new phone or web/mobile bot interactively.

uv tool install "pipecat-ai[cli]"
pipecat init
Follow the quickstart guide to get your very first bot running, or dive a little deeper into bootstrapping a project.

Manual installation
Prefer to wire things up yourself?

Install the module

# For new projects
uv init my-pipecat-app
cd my-pipecat-app
uv add pipecat-ai

# Or for existing projects
uv add pipecat-ai
Set up your environment

cp env.example .env
To keep things lightweight, only the core framework is included by default. If you need support for third-party AI services, you can add the necessary dependencies with:

uv add "pipecat-ai[option,...]"
Using pip? You can still use pip install pipecat-ai and pip install "pipecat-ai[option,...]" to get set up.

From here, the code examples below are the best way to learn — agents you can run, read, and adapt.

🧪 Code examples
Focused examples — small agents that each illustrate one or two specific services or concepts
Example apps — complete applications you can use as starting points for development
🛠️ Developing Pipecat
Prerequisites
Minimum Python Version: 3.11 Recommended Python Version: >= 3.12

Setup steps
Clone the repository and navigate to it:

git clone https://github.com/pipecat-ai/pipecat.git
cd pipecat
Install development and testing dependencies:

uv sync --group dev --all-extras \
  --no-extra gstreamer \
  --no-extra local \
Install the git pre-commit hooks:

uv run pre-commit install
Note: Some extras (local, gstreamer) require system dependencies. See documentation if you encounter build errors.

Claude Code skills
Install development workflow skills for contributing to Pipecat with Claude Code:

claude plugin marketplace add pipecat-ai/pipecat
claude plugin install pipecat-dev@pipecat-dev-skills
Running tests
To run all tests, from the root directory:

uv run pytest
Tests run in parallel, one worker per CPU core. Pass -n 0 to run them in a single process.

Run a specific test suite:

uv run pytest tests/test_name.py
🤝 Contributing
We welcome contributions from the community! Whether you're fixing bugs, improving documentation, or adding new features, here's how you can help:

Found a bug? Open an issue
Have a feature idea? Start a discussion
Want to contribute code? Check our CONTRIBUTING.md guide
Documentation improvements? Docs PRs are always welcome
Before submitting a pull request, please check existing issues and PRs to avoid duplicates.

We aim to review all contributions promptly and provide constructive feedback to help get your changes merged.

🛟 Getting help
➡️ Join our Discord

➡️ Read the docs

➡️ Reach us on X

➡️ Enterprise support for consulting and support agreements