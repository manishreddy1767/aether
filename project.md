# AETHER — Project Specification

## 1. Project Goal

AETHER is a privacy-focused Windows desktop browser with a minimal,
customizable interface and local AI-powered research tools.

The project should demonstrate strong software engineering, secure
desktop application architecture, and practical applied AI/ML engineering.

### Core principles

- Browsing must work without AI.
- Prefer local AI inference to cloud services where practical.
- Treat all webpage content as untrusted input.
- Keep trusted application UI separate from remote webpage content.
- Make privacy, security, accessibility, and usability core requirements.
- Prefer free and open-source tools where suitable.
- Measure AI quality and performance rather than making unsupported claims.

## 2. Planned Architecture

Status: PROPOSED. Validate design choices before implementation.

### Desktop application

- Electron for the Windows desktop application.
- Chromium provided through Electron for web content.
- JavaScript, HTML, and CSS for the initial application UI.
- Use supported Electron APIs and secure boundaries between the app
  and remote websites.
- Keep browser state, permissions, downloads, and navigation under
  deliberate application control.

### Local AI

- Ollama as the local model runtime.
- Qwen3 8B as the initial candidate model.
- A local HTTP API for communication between the trusted application
  process and Ollama.
- Initial AI features: webpage summarization, explain selection,
  and question answering about a webpage.
- Later evaluate retrieval, source-linked answers, and multi-page research.
- AI features must fail gracefully when the model is unavailable.

### Data and research

- Evaluate SQLite for persistent browser and research metadata.
- Keep user data and model files out of version control.
- Evaluate local search and retrieval approaches when their requirements
  become clear.

### Testing and development

- Git and GitHub for version control.
- Antigravity and ChatGPT for development assistance and review.
- Add automated tests and reproducible AI evaluation as the project grows.
- Document setup instructions, architectural decisions, limitations,
  and measured results.

## 3. Security Requirements

- Enable context isolation for renderer processes.
- Disable Node.js integration for remote webpage content.
- Use sandboxing where supported and appropriate.
- Expose only narrow, validated APIs through preload scripts.
- Validate and authorize IPC messages.
- Restrict navigation, new windows, permissions, and external protocols.
- Never give remote webpages arbitrary filesystem or shell access.
- Never expose the local AI endpoint directly to untrusted webpages.
- Treat webpage text as untrusted data, including possible prompt injection.
- Do not allow AI-generated instructions to execute privileged actions
  without explicit authorization and appropriate validation.
- Never commit credentials, secrets, private user data, or local model files.

## 4. Feature Roadmap

### Foundation

- Minimal Electron application.
- Address bar and basic navigation.
- Tab management and session restoration.
- Keyboard-accessible interface.
- Secure separation of trusted UI and web content.

### Privacy and browser features

- Per-site permissions.
- Private browsing and data controls.
- Tracker and ad blocking, subject to technical and license review.
- Downloads, reading list, and workspace management.

### Local AI and research

- Ollama connectivity.
- Webpage summarization.
- Explain selected text.
- Ask this page.
- Source-linked answers and evidence-aware responses.
- Research collections and multi-page comparison.
- AI evaluation and prompt-injection testing.

### Quality and portfolio

- Automated regression tests.
- Performance and resource-use measurements.
- AI evaluation dataset and experiment reports.
- Architecture documentation and reproducible setup.
- Windows packaging and a demonstration.

Features are candidates, not promises. Prioritize small, tested milestones.

## 5. Current Tasks

The authoritative current milestone, completed work, blockers, next actions,
and verification evidence are maintained in `brain.md`.

## 6. Decisions and Change Control

- Clearly distinguish confirmed decisions from proposals.
- Do not silently change the project's goals or security requirements.
- Record significant architectural changes and their rationale in `brain.md`.
- Update this file when long-term requirements or architecture change.
- Check dependency licenses before adopting third-party components.
- Do not claim a feature is complete without verification.

## 7. Definition of Done

A milestone is complete only when:

1. Its intended changes are implemented or its documentation task is finished.
2. Relevant checks or tests have been run.
3. Results and remaining limitations are recorded.
4. `brain.md` reflects the verified state.
5. `project.md` is updated if a lasting requirement or architectural decision changed.
6. The changes have been reviewed before being committed.
