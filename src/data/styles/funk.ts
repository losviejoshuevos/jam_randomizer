import type { StyleProfile } from "@/lib/music/domain/style-profile";

export const funkStyleProfile = {
  id: "funk",
  name: "Funk",
  bpmRange: { min: 88, max: 118 },
  allowedMeters: [
    { value: "4/4", weight: 9 },
    { value: "3/4", weight: 1 },
  ],
  allowedModes: [
    { value: "major", weight: 6 },
    { value: "minor", weight: 4 },
  ],
  chordVocabulary: [
    {
      roman: "I",
      harmonicFunction: "tonic",
      weight: 8,
      minimumComplexity: "easy",
      allowedModes: ["major"],
      tonalSource: { kind: "diatonic" },
      tags: ["vamp"],
    },
    {
      roman: "i7",
      harmonicFunction: "tonic",
      weight: 8,
      minimumComplexity: "easy",
      allowedModes: ["minor"],
      tonalSource: { kind: "diatonic" },
      tags: ["vamp"],
    },
    {
      roman: "IV",
      harmonicFunction: "predominant",
      weight: 5,
      minimumComplexity: "easy",
      allowedModes: ["major"],
      tonalSource: { kind: "diatonic" },
    },
    {
      roman: "iv7",
      harmonicFunction: "predominant",
      weight: 5,
      minimumComplexity: "easy",
      allowedModes: ["minor"],
      tonalSource: { kind: "diatonic" },
    },
    {
      roman: "I7",
      harmonicFunction: "color",
      weight: 7,
      minimumComplexity: "easy",
      allowedModes: ["major"],
      tonalSource: { kind: "parallel-mode" },
      tags: ["vamp", "funk-dominant"],
    },
    {
      roman: "IV7",
      harmonicFunction: "color",
      weight: 5,
      minimumComplexity: "easy",
      allowedModes: ["major"],
      tonalSource: { kind: "parallel-mode" },
      tags: ["funk-dominant"],
    },
    {
      roman: "V7",
      harmonicFunction: "dominant",
      weight: 6,
      minimumComplexity: "easy",
      allowedModes: ["major", "minor"],
      tonalSource: { kind: "diatonic" },
    },
    {
      roman: "bVII7",
      harmonicFunction: "color",
      weight: 4,
      minimumComplexity: "medium",
      allowedModes: ["major"],
      tonalSource: { kind: "parallel-mode" },
    },
    {
      roman: "IV9",
      harmonicFunction: "color",
      weight: 3,
      minimumComplexity: "medium",
      allowedModes: ["minor"],
      tonalSource: { kind: "parallel-mode" },
    },
    {
      roman: "V7/V",
      harmonicFunction: "dominant",
      weight: 2,
      minimumComplexity: "advanced",
      allowedModes: ["major", "minor"],
      tonalSource: { kind: "neighboring-key", circleOfFifthsOffset: 1 },
      tags: ["must-resolve"],
    },
  ],
  transitions: {
    tonic: [
      { value: "tonic", weight: 3 },
      { value: "color", weight: 3 },
      { value: "predominant", weight: 4 },
    ],
    predominant: [
      { value: "tonic", weight: 2 },
      { value: "dominant", weight: 6 },
      { value: "color", weight: 2 },
    ],
    dominant: [
      { value: "tonic", weight: 8 },
      { value: "color", weight: 2 },
    ],
    color: [
      { value: "tonic", weight: 4 },
      { value: "predominant", weight: 4 },
      { value: "dominant", weight: 2 },
    ],
    passing: [
      { value: "tonic", weight: 4 },
      { value: "predominant", weight: 3 },
      { value: "dominant", weight: 3 },
    ],
  },
  harmonicRhythms: [
    {
      value: {
        id: "one-chord-per-bar",
        durationsBars: [1, 1, 1, 1],
        minimumComplexity: "easy",
        allowedMeters: ["4/4", "3/4"],
        allowedSections: ["A", "B"],
      },
      weight: 7,
    },
    {
      value: {
        id: "two-bar-vamp",
        durationsBars: [2, 2],
        minimumComplexity: "easy",
        allowedMeters: ["4/4", "3/4"],
        allowedSections: ["A"],
      },
      weight: 5,
    },
  ],
  sectionRules: {
    A: {
      bars: [
        { value: 4, weight: 4 },
        { value: 8, weight: 6 },
      ],
      allowedStartFunctions: [{ value: "tonic", weight: 1 }],
      allowedEndFunctions: [
        { value: "tonic", weight: 6 },
        { value: "dominant", weight: 4 },
      ],
      tension: "medium",
      minimumDistinctFunctions: 2,
      requireLoopability: true,
    },
    B: {
      bars: [
        { value: 4, weight: 5 },
        { value: 8, weight: 5 },
      ],
      allowedStartFunctions: [
        { value: "predominant", weight: 6 },
        { value: "color", weight: 4 },
      ],
      allowedEndFunctions: [
        { value: "dominant", weight: 7 },
        { value: "tonic", weight: 3 },
      ],
      tension: "high",
      minimumDistinctFunctions: 2,
      requireLoopability: false,
    },
  },
  tonalSourceWeights: {
    strict: { diatonic: 1, parallelMode: 0, neighboringKey: 0 },
    colorful: { diatonic: 0.85, parallelMode: 0.15, neighboringKey: 0 },
    adventurous: {
      diatonic: 0.65,
      parallelMode: 0.25,
      neighboringKey: 0.1,
    },
  },
  validationRules: {
    maximumSameChordInSequence: 2,
    maximumGenerationAttempts: 20,
    maximumPassingDurationBars: 0.5,
    requireDifferentBFromA: true,
  },
} satisfies StyleProfile;
