
const fs = require('fs');
function removeLine(file, searchStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split('\n').filter(line => !line.includes(searchStr)).join('\n');
  fs.writeFileSync(file, content);
}
removeLine('src/components/containers/StudySessionContainer.tsx', 'import * as React');
removeLine('src/components/molecules/EvaluationResult.tsx', 'import * as React');
removeLine('src/components/molecules/Flashcard.tsx', 'import * as React');

