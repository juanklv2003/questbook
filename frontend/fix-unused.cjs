
const fs = require('fs');

function removeLine(file, searchStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split('\n').filter(line => !line.includes(searchStr)).join('\n');
  fs.writeFileSync(file, content);
}

removeLine('src/components/containers/StudySessionContainer.tsx', 'import React');
removeLine('src/components/molecules/EvaluationResult.tsx', 'import React');
removeLine('src/components/molecules/Flashcard.tsx', 'import React');
removeLine('src/components/molecules/Flashcard.tsx', 'import { cn }');
removeLine('src/components/organisms/DeckUploader.tsx', 'import { Button }');
removeLine('src/components/organisms/DeckUploader.tsx', 'FileType');
removeLine('src/hooks/useDeckFlashcards.ts', 'API_BASE');
removeLine('src/hooks/useDeckGenerator.ts', 'API_BASE');
removeLine('src/hooks/useDeckGenerator.ts', 'Deck');
removeLine('src/hooks/useEvaluator.ts', 'API_BASE');

