/**
 * Temporary diagnostic: extract PDF text and run deck generation with verbose [deck-gen] logs.
 * Usage: npm run diagnose:deck-gen -- path/to/file.pdf
 */
import * as dotenv from 'dotenv';

dotenv.config();

import { extractTextFromPdfPath } from '../modules/decks/infra/PdfTextExtractor';
import { capDeckSourceText } from '../modules/decks/domain/deckGenerationLimits';
import { GeminiFlashcardGenerator } from '../modules/decks/infra/GeminiFlashcardGenerator';

type Scenario = {
  label: string;
  cardCount: number;
  difficulty: 'medium' | 'hard';
};

const SCENARIOS: Scenario[] = [
  { label: 'medium/30', cardCount: 30, difficulty: 'medium' },
  { label: 'hard/50', cardCount: 50, difficulty: 'hard' },
];

async function runScenario(
  generator: GeminiFlashcardGenerator,
  text: string,
  scenario: Scenario
): Promise<void> {
  console.info('\n[diagnose-deck-gen] scenario start', scenario);
  const startedAt = Date.now();
  try {
    const cards = await generator.generateFromText(text, {
      cardCount: scenario.cardCount,
      difficulty: scenario.difficulty,
      language: 'es',
    });
    console.info('[diagnose-deck-gen] scenario ok', {
      ...scenario,
      generated: cards.length,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('[diagnose-deck-gen] scenario failed', {
      ...scenario,
      durationMs: Date.now() - startedAt,
      err: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function main(): Promise<void> {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: npm run diagnose:deck-gen -- <path-to.pdf>');
    process.exit(1);
  }

  console.info('[diagnose-deck-gen] extracting PDF', { pdfPath });
  const rawText = await extractTextFromPdfPath(pdfPath);
  const text = capDeckSourceText(rawText);
  console.info('[diagnose-deck-gen] text ready', {
    rawChars: rawText.length,
    cappedChars: text.length,
  });

  const generator = new GeminiFlashcardGenerator();
  for (const scenario of SCENARIOS) {
    await runScenario(generator, text, scenario);
  }
  console.info('[diagnose-deck-gen] all scenarios completed');
}

main().catch((error) => {
  console.error('[diagnose-deck-gen] fatal', error);
  process.exit(1);
});
