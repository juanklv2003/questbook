# Spec: Memo AI API, Prompts & Frontend (TSX)

Listen to me, dude. Let me be real. You want to build this right? We are locking down the exact specifications BEFORE we write any code. No shortcuts, no guessing. Here are the precise API contracts, the exact AI prompts, and the strict React TSX component structure you'll use. If you deviate and mix logic with presentation, you're on your own. 

## 1. API Contracts

All endpoints will be prefixed with `/api/v1`. The communication MUST be strictly typed. 

### Decks & Flashcards

**`POST /api/v1/decks/generate`**
*Purpose:* Upload a PDF or raw text to generate a new deck using Gemini.
*Request:* `multipart/form-data`
- `name` (string): Name of the deck.
- `folderId` (string, optional): ID of the folder.
- `file` (File, optional): The PDF document.
- `content` (string, optional): Raw text if not using a PDF.
*(Must provide either `file` or `content`)*

*Response (201 Created):*
```json
{
  "deckId": "uuid",
  "name": "History 101",
  "flashcardsCount": 15
}
```

**`GET /api/v1/decks/:deckId/flashcards`**
*Purpose:* Fetch all flashcards for a specific deck.
*Response (200 OK):*
```json
{
  "flashcards": [
    {
      "id": "uuid",
      "deckId": "uuid",
      "question": "What is the capital of France?",
      "answer": "Paris"
    }
  ]
}
```

### Evaluations

**`POST /api/v1/evaluations/evaluate`**
*Purpose:* Submit a user's free-text answer for AI evaluation against the correct answer.
*Request (application/json):*
```json
{
  "flashcardId": "uuid",
  "userAnswer": "It's Paris, I think."
}
```

*Response (200 OK):*
```json
{
  "score": 100,
  "isCorrect": true,
  "feedback": "Perfect! You got it right."
}
```

---

## 2. Gemini Prompts

We are using structured output. We don't want the AI rambling. We want JSON. 

### Prompt A: Flashcard Generation
**Context:** Used in the `Decks` domain when processing text/PDF.
```text
You are an expert educator. Your task is to analyze the provided text and generate high-quality flashcards for studying. Focus on key concepts, definitions, and relationships.

Return the output STRICTLY as a JSON array of objects with the exact keys: 'question' and 'answer'.
Do NOT include markdown blocks, greetings, or any other text. ONLY the JSON array.

Text to analyze:
{{EXTRACTED_TEXT}}
```

### Prompt B: Free-Text Evaluation
**Context:** Used in the `Evaluations` domain when a user submits an answer.
```text
You are a strict but fair teacher evaluating a student's answer to a flashcard.

Question: {{QUESTION}}
Correct Answer: {{CORRECT_ANSWER}}
Student's Answer: {{USER_ANSWER}}

Evaluate the student's answer based on comprehension, not exact wording. Does it capture the core concept?
Return STRICTLY a JSON object with the following fields:
- 'score': an integer from 0 to 100 representing how correct the answer is.
- 'isCorrect': a boolean indicating if the answer is considered passing (score >= 70).
- 'feedback': a brief, constructive explanation of what was right, wrong, or missing (max 2 sentences).

Do NOT include markdown blocks, greetings, or any other text. ONLY the JSON object.
```

---

## 3. Frontend Architecture (React TSX)

You explicitly asked to ensure TSX. Here is your strict Container-Presentational structure. DO NOT put `fetch` calls inside your buttons, seriously.

### Custom Hooks (State & API Logic)
- `useDecks()`: Manages fetching lists of decks and folder structures. Uses React Query (or SWR) under the hood.
- `useDeckGenerator()`: Handles the `multipart/form-data` upload state, loading progress, and error handling for the AI generation.
- `useFlashcardStudy(deckId: string)`: Manages the current card index in a study session.
- `useEvaluator()`: Handles submitting the user's answer to the evaluation endpoint and storing the AI's feedback.

### Components Directory Structure

**Atoms** (Dumb components, purely visual)
- `Button.tsx`: Props `{ variant, isLoading, onClick, children }`
- `TextArea.tsx`: Props `{ value, onChange, placeholder, disabled }`
- `Badge.tsx`: Props `{ color, label }` (Used for "Correct" / "Incorrect" tags)

**Molecules** (Simple combinations)
- `Flashcard.tsx`: Displays the card. Props `{ question, answer (optional), isFlipped }`
- `EvaluationResult.tsx`: Shows the AI feedback. Props `{ score, feedback, isCorrect }`

**Organisms** (Complex UI sections, still mostly dumb)
- `DeckUploader.tsx`: Drag & drop zone + name input + submit button.
- `StudyPlayer.tsx`: Combines `Flashcard`, `TextArea` for user input, and submit button.

**Containers** (Smart components, where hooks live)
- `StudySessionContainer.tsx`: 
  - Calls `useFlashcardStudy` and `useEvaluator`.
  - Passes current card and evaluation state down to `StudyPlayer`.
  - NO UI LAYOUT HERE. Just logic and returning the Organism.
- `DeckDashboardContainer.tsx`:
  - Calls `useDecks` and `useDeckGenerator`.
  - Orchestrates the deck list view and the upload modal.

---

## Next Steps
This is the spec. If you agree, we move to `sdd-design` to iron out the class diagrams or deeper component interfaces. Don't write code until the design is completely locked.
