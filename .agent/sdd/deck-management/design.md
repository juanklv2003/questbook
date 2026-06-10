# Technical Design: Deck Management (PDF Storage & Deletion)

This document outlines the low-level technical design for the deck management feature, based on the approved specifications. It details backend infrastructure, dependency injection strategy, and frontend architecture utilizing the Atomic Design pattern.

## 1. Backend Infrastructure Design

### 1.1 Cloudinary Storage Adapter
- **File Path**: `backend/src/modules/decks/infra/CloudinaryStorageAdapter.ts`
- **Responsibility**: Implement `ICloudStoragePort` using the `cloudinary` SDK.
- **Dependencies**: Requires adding `cloudinary` to the backend `package.json`.
- **Implementation**:
  - `uploadPdf(fileBuffer: Buffer)`: Converts the incoming buffer to a stream to upload to Cloudinary. Must be configured properly to handle PDFs.
  - `deletePdf(publicId: string)`: Calls `cloudinary.uploader.destroy(publicId)`.
  - Expects environment variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### 1.2 Data Access Layer Updates
- **File Path**: `backend/src/modules/decks/infra/PostgresDeckRepository.ts`
- **Responsibility**: Implement the new `delete` method and update existing queries.
- **Changes**:
  - `create`: Add `pdf_url` and `pdf_public_id` to the `INSERT` statement and returning clause.
  - `findById` & `findAll`: Map `pdf_url` to `pdfUrl` and `pdf_public_id` to `pdfPublicId`.
  - `delete`: Add a query `DELETE FROM decks WHERE id = $1`. Note: The SQL schema should use `ON DELETE CASCADE` on flashcards. If not configured via migration, manually delete flashcards in the repo or UseCase.

### 1.3 Use Cases
- **DeleteDeckUseCase**
  - **File Path**: `backend/src/modules/decks/useCases/DeleteDeckUseCase.ts`
  - **Constructor**: `constructor(private deckRepo: IDeckRepository, private cloudStorage: ICloudStoragePort)`
  - **Flow**:
    1. Fetch `deck` via `this.deckRepo.findById(deckId)`.
    2. Throw `404` if not found.
    3. Throw `403` if `deck.userId !== currentUserId`.
    4. Call `this.deckRepo.delete(deckId)`.
    5. Call `this.cloudStorage.deletePdf(deck.pdfPublicId)` if `pdfPublicId` exists.
- **GenerateDeckUseCase**
  - **File Path**: `backend/src/modules/decks/useCases/GenerateDeckUseCase.ts`
  - **Changes**: Inject `ICloudStoragePort`. Before deck creation, invoke `cloudStorage.uploadPdf(file.buffer)` and pass the resulting URL/ID to the new Deck domain entity.

### 1.4 Dependency Injection & Router Wiring
- **File Path**: `backend/src/modules/decks/http/DeckRouter.ts` & `DeckController.ts`
- **Wiring**:
  ```typescript
  const cloudinaryAdapter = new CloudinaryStorageAdapter();
  const generateDeckUseCase = new GenerateDeckUseCase(deckRepo, flashcardRepo, aiService, cloudinaryAdapter);
  const deleteDeckUseCase = new DeleteDeckUseCase(deckRepo, cloudinaryAdapter);
  ```
- **Routing**: Map `DELETE /api/v1/decks/:id` to `deckController.deleteDeck`.
- **Controller**: Handle the request, extract `req.params.id` and `req.user.id`, invoke the use case, and return `204 No Content`.

## 2. Frontend Structure Design

Following the Container-Presentational and Atomic Design patterns:

### 2.1 Atomic Components
- **Atom: `DeckDeleteButton`**
  - **File Path**: `frontend/src/components/atoms/DeckDeleteButton.tsx`
  - **Props**: `DeckDeleteButtonProps { deckId: string; onDeleteSuccess: () => void; onDeleteError?: (error: Error) => void; }`
  - **Design**: A small, discreet ghost button with a `Trash2` (Lucide) icon. Includes an inline confirmation mechanism (e.g., clicking once changes to a "Confirm?" state). On confirmation, calls the `DELETE` API and invokes `onDeleteSuccess`.

- **Organism: `PdfViewer`**
  - **File Path**: `frontend/src/components/organisms/PdfViewer.tsx`
  - **Props**: `PdfViewerProps { pdfUrl: string; title?: string; fallbackText?: string; }`
  - **Design**: Encapsulates an `<iframe>` tailored for PDF viewing.
  - **Structure**:
    ```tsx
    <div className="w-full h-full min-h-[600px] flex flex-col border rounded-lg overflow-hidden bg-muted/10">
      {title && <div className="p-3 border-b bg-muted/30 font-medium">{title}</div>}
      <iframe src={`${pdfUrl}#toolbar=0`} className="flex-1 w-full" title={title || "PDF Viewer"} />
    </div>
    ```

### 2.2 Container Integration
- **DeckDashboardContainer**
  - **File Path**: `frontend/src/components/containers/DeckDashboardContainer.tsx`
  - **Changes**: 
    - Render `DeckDeleteButton` on each Deck card (positioned top-right).
    - Handle `onDeleteSuccess` to filter the deleted deck from the local `decks` state optimistically.
    - Ensure event propagation is stopped (`e.stopPropagation()`) so the card click does not fire.

- **StudySessionContainer**
  - **File Path**: `frontend/src/components/containers/StudySessionContainer.tsx`
  - **Changes**:
    - Update data fetching to acquire the `pdfUrl` (e.g., modifying `useDeckFlashcards` to also return deck metadata, or adding a `useDeck` hook).
    - Adjust the layout of `StudySessionInner` to a split-screen (`grid grid-cols-1 lg:grid-cols-2 gap-8`).
    - **Left Column**: Render `PdfViewer` with the deck's `pdfUrl`.
    - **Right Column**: Render the existing `StudyPlayer`.
    - *Fallback*: If no `pdfUrl` is found (e.g. older decks), fallback to the original single-column centered layout.

## 3. Risks & Constraints
- Ensure `cloudinary` NPM package is installed in the backend.
- Consider CSP (Content Security Policy) adjustments if the frontend blocks iframes from Cloudinary.
- DB Schema must be updated before executing `apply` phase.
