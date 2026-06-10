# Apply Progress: Deck Management

## Completed Tasks
### Phase 1: Database Schema Migrations
- [x] **Task 1.1: Create Migration** 
  - Created `migratePdfStorage.ts` to add `pdf_url` and `pdf_public_id` to the `decks` table.
  - Executed migration successfully against the Neon database. (Cascade delete was already present from initial setup).

### Phase 2: Backend Infrastructure & Domain
- [x] **Task 2.1: Dependencies & Env Vars**
  - Installed `cloudinary` in the backend.
  - Validated that `.env` already contains Cloudinary credentials and added them to `env.ts` schema validation.
- [x] **Task 2.2: Domain Interface**
  - Created `ICloudStoragePort` with `uploadPdf` and `deletePdf` methods.
  - Updated `IDeckRepository` and `Deck` domain entities to support new fields and delete capabilities.
- [x] **Task 2.3: Cloudinary Adapter**
  - Implemented `CloudinaryStorageAdapter` in `backend/src/modules/decks/infra/CloudinaryStorageAdapter.ts`.

## Pending Tasks
### Phase 3: Backend Data Access Layer
- [x] Task 3.1: PostgresDeckRepository Updates

### Phase 4: Backend Use Cases
- [x] Task 4.1: Update GenerateDeckUseCase
- [x] Task 4.2: Implement DeleteDeckUseCase

### Phase 5: Backend HTTP Layer
- [x] Task 5.1: Controller & Routing

### Phase 6: Frontend Components
- [x] Task 6.1: DeckDeleteButton Atom
- [x] Task 6.2: PdfViewer Organism

### Phase 7: Frontend Integration
- [x] Task 7.1: Deck Dashboard Integration
- [x] Task 7.2: Study Session Split-View Integration
