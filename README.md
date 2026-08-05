# Jam Randomizer

Jam Randomizer is a browser-based tool for creating clear, reproducible harmony cards for live jam sessions.

The first supported style will be Funk. A session contains two progressions and a stage timeline: A → B → A. The harmony engine will remain independent from React, Zustand, browser APIs, and style-specific conditions.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the editor and [http://localhost:3000/stage](http://localhost:3000/stage) for Stage Mode.

## Checks

```bash
npm run lint
npm test
npm run build
```

The current iteration contains a deterministic, validated Funk generator for section A, automatic card codes for musical QA, RomanChord rendering, the serializable style profile, and a read-only editor screen. Section B, Stage Mode timing, persistence, and manual editing are intentionally deferred to later iterations.
