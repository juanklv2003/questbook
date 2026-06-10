# Task Breakdown: Deck Management (PDF Storage & Deletion)

This document breaks down the specification and technical design into a strict, sequentially ordered list of actionable tasks.

## 1. Database Schema Migrations
- **Task 1.1: Create Migration**
  - Create a new SQL migration file to add `pdf_url` (VARCHAR 255) and `pdf_public_id` (VARCHAR 255) to the `decks` table.
  - Add or verify the `ON DELETE CASCADE` constraint on the `flashcards` table pointing to `decks(id)`.
  - Ensure the migration has both `UP` and `DOWN` (rollback) steps.

## 2. Backend Infrastructure & Domain
- **Task 2.1: Dependencies & Env Vars**
  - Install the `cloudinary` NPM package in the backend.
  - Update `.env.example` with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- **Task 2.2: Domain Interface**
  - Create the `ICloudStoragePort` interface defining `uploadPdf(fileBuffer: Buffer)` and `deletePdf(publicId: string)`.
  - Update `IDeckRepository` to include `delete(deckId: string): Promise<void>` and `findById(deckId: string): Promise<Deck | null>`.
- **Task 2.3: Cloudinary Adapter**
  - Implement `CloudinaryStorageAdapter` in `backend/src/modules/decks/infra/CloudinaryStorageAdapter.ts` adhering to `ICloudStoragePort`.

## 3. Backend Data Access Layer
- **Task 3.1: PostgresDeckRepository Updates**
  - Modify the `create` method to include `pdf_url` and `pdf_public_id` in the `INSERT` and returning clauses.
  - Modify `findById` and `findAll` (or related query methods) to map the DB snake_case fields to camelCase domain entity properties (`pdfUrl`, `pdfPublicId`).
  - Implement the `delete` method to execute `DELETE FROM decks WHERE id = $1`.

## 4. Backend Use Cases
- **Task 4.1: Update GenerateDeckUseCase**
  - Inject `ICloudStoragePort` into `GenerateDeckUseCase`.
  - Call `uploadPdf` with the incoming file buffer before saving the deck.
  - Assign the returned `url` and `publicId` to the newly created Deck entity.
- **Task 4.2: Implement DeleteDeckUseCase**
  - Create `DeleteDeckUseCase` that checks for deck existence (404) and user authorization (403).
  - Execute `deckRepo.delete(deckId)` and subsequently call `cloudStorage.deletePdf(deck.pdfPublicId)` if a `pdfPublicId` exists.

## 5. Backend HTTP Layer
- **Task 5.1: Controller & Routing**
  - Implement the `deleteDeck` method in `DeckController.ts` returning a `204 No Content` on success.
  - Update `DeckRouter.ts` to wire dependencies: instantiate `CloudinaryStorageAdapter` and `DeleteDeckUseCase`. Update `GenerateDeckUseCase` construction.
  - Register `DELETE /api/v1/decks/:id` pointing to the controller method.

## 6. Frontend Components
- **Task 6.1: DeckDeleteButton Atom**
  - Create `frontend/src/components/atoms/DeckDeleteButton.tsx`.
  - Implement inline confirmation (click once to confirm).
  - Make API call to `DELETE /api/v1/decks/:id` upon confirmation and trigger `onDeleteSuccess` or `onDeleteError` props.
- **Task 6.2: PdfViewer Organism**
  - Create `frontend/src/components/organisms/PdfViewer.tsx`.
  - Implement `iframe` to display the PDF using the provided `pdfUrl` (`${pdfUrl}#toolbar=0`).

## 7. Frontend Integration
- **Task 7.1: Deck Dashboard Integration**
  - Update `DeckDashboardContainer.tsx` (or related list component) to render `DeckDeleteButton` on each Deck card.
  - Handle the `onDeleteSuccess` callback to optimistically remove the deleted deck from the local UI state. Ensure event bubbling is prevented.
- **Task 7.2: Study Session Split-View Integration**
  - Update data fetching in `StudySessionContainer.tsx` (or relevant hooks) to fetch and include the deck's `pdfUrl`.
  - Modify the layout to use a CSS grid split-screen (e.g., `lg:grid-cols-2`) when a `pdfUrl` is present.
  - Render `PdfViewer` on the left and the existing `StudyPlayer` on the right. Handle single-column fallback for decks without a PDF.
