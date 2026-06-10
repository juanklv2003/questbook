# Explore Phase: Deck Deletion & PDF Management

## 1. Feature 1: Delete Decks

### Current State
- No deletion endpoint exists in `DeckRouter.ts`.
- `IDeckRepository.ts` lacks a `delete` method.
- The `flashcards` table has a `deck_id` foreign key pointing to `decks.id`.

### Technical Exploration
1. **Backend Endpoint**:
   - Need to add `DELETE /api/v1/decks/:deckId` in `DeckRouter.ts`.
   - Requires a new `DeleteDeckUseCase` that orchestrates the deletion.
2. **Database Cascading**:
   - When a deck is deleted, its flashcards must be removed.
   - If `ON DELETE CASCADE` is set at the DB schema level, deleting the deck will automatically remove the flashcards. If not, the application must delete the flashcards first via the `FlashcardRepository` before deleting the deck. Given the current `project-context.md` says migrations are handled manually, relying on application-level deletion or ensuring the DB schema has `CASCADE` is necessary.
3. **Auth Constraints**:
   - The deletion must be restricted to the owner of the deck.
   - The Use Case should first `findById(deckId)`, verify `deck.userId === req.user.userId`, and then proceed with the deletion. Throw `403 Forbidden` or `404 Not Found` if the deck belongs to someone else.
4. **Frontend Confirmation**:
   - A React confirmation modal is required to prevent accidental deletions.
   - It should be built using the Atomic Design principles (e.g., a `Modal` atom/molecule) and triggered from the presentational components but controlled by the container.

## 2. Feature 2: PDF Viewing & Modification (Replacement)

### Current State
- The backend currently uses `multer.memoryStorage()`. Files are never persisted; their buffer is converted to a string and passed directly to the Gemini AI in `DeckController.generate`.
- `react-pdf` is not installed in the frontend `package.json`.
- User clarification received: "modificar el pdf me refiero a poder borrar ese pdf e importar otro" (modifying the PDF means being able to delete that PDF and import another one).

### Technical Exploration
1. **Visualization (PDF Viewing)**:
   - To visualize a PDF on the frontend, the file must be accessible via a URL.
   - **Storage Options**: Since files are not currently persisted, we need a storage solution. Options:
     - **Cloud Storage** (AWS S3, Cloudinary): Recommended for production.
     - **Database Storage**: Not recommended for PDFs, but possible if files are small.
     - **Local Disk**: Not suitable for deployed environments.
   - **Frontend Viewer**: We can use `react-pdf` to render the PDF or simply an `<iframe src="url_to_pdf" />` if the browser natively supports it.
2. **"Modifying" a PDF (Replacing)**:
   - Since the user clarified that "modification" just means replacing the file, we don't need complex PDF editing libraries.
   - **Options to replace**:
     1. Simply allow the user to **delete the entire deck** (using Feature 1) and create a new one with the new PDF. This requires zero extra backend logic.
     2. Create a dedicated `PUT /api/v1/decks/:id/file` or similar endpoint to replace the file, which would re-trigger the Gemini AI and replace all existing flashcards (which is functionally very similar to deleting and recreating, but keeps the deck ID).
   - Option 1 is much simpler and leverages the deck deletion feature being built.

## Recommended Next Steps
- Implement Deck Deletion as it covers both Feature 1 and the "delete" part of Feature 2.
- Decide on a Storage Strategy (e.g. AWS S3) if actual PDF viewing is strictly required. Otherwise, just allow re-uploading via deck creation.
- Proceed to `sdd-propose` to outline the exact implementation plan for these features.
