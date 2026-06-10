# Proposal: Deck Management (Deletion & Cloudinary PDF Storage)

## Intent

The user needs to be able to view the PDF from which flashcards were generated and have the ability to delete decks (along with their associated flashcards and PDF files). Since the original implementation only held the PDF in memory during flashcard generation, we need a persistent storage solution. We will use Cloudinary to store the PDFs and store the resulting URL in our database. 

## Scope

### In Scope
- Uploading generated PDF buffers (via multer) to Cloudinary.
- Storing the Cloudinary secure URL (`pdfUrl`) and public ID (`pdfPublicId`) in the `decks` table/entity.
- Creating the `DELETE /api/v1/decks/:id` endpoint in the backend.
- Deleting the PDF asset from Cloudinary when the deck is deleted.
- Implementing cascading deletes in the database for `flashcards` when a `deck` is deleted (or handling it via application logic if not possible at the DB level).
- Displaying the PDF in the frontend using a simple `iframe` or HTML `<object>` tag pointing to the Cloudinary URL.
- Creating a confirmation modal in the frontend for deck deletion to prevent accidental loss.

### Out of Scope
- Advanced PDF viewing functionality like text selection, highlighting, or page-by-page rendering (we will rely on native browser PDF support via `iframe`).
- Modifying an existing PDF without deleting the deck (the process of "modifying" will consist of deleting the deck and creating a new one).
- Adding complex folder management for decks (beyond what currently exists).

## Approach

1. **Storage (Cloudinary)**: 
   - We will integrate the `cloudinary` SDK into the backend.
   - When `DeckController.generate` is hit, the file buffer will be uploaded to Cloudinary using `cloudinary.uploader.upload_stream` (since we are already using `multer.memoryStorage()`).
   - We will capture the `secure_url` and `public_id` from the Cloudinary response and save them to the `decks` record.
   
2. **Database Updates**:
   - Add `pdfUrl` and `pdfPublicId` to the `Deck` domain entity and database schema.
   - Ensure the `flashcards` table has an `ON DELETE CASCADE` constraint on `deck_id`, or update the `DeleteDeckUseCase` to delete flashcards first.
   
3. **Deletion (Backend)**:
   - Introduce `DeleteDeckUseCase`.
   - The use case will verify ownership: `deck.userId === req.user.userId`.
   - Delete the PDF from Cloudinary using `cloudinary.uploader.destroy(deck.pdfPublicId)`.
   - Delete the deck from the database (which cascades to flashcards).

4. **Frontend Visualization & Deletion**:
   - In the Deck Detail view, add a new section or tab to display the PDF using `<iframe src={deck.pdfUrl} />`.
   - Add a "Delete Deck" button that triggers a confirmation modal.
   - Upon confirmation, call the new `DELETE /api/v1/decks/:id` endpoint and redirect the user back to the dashboard/folder.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/modules/decks/domain/Deck.ts` | Modified | Add `pdfUrl` and `pdfPublicId` properties. |
| `backend/src/modules/decks/http/DeckController.ts` | Modified | Integrate Cloudinary upload in `generate` and add `delete` method. |
| `backend/src/modules/decks/http/DeckRouter.ts` | Modified | Add `DELETE /api/v1/decks/:id` route. |
| `backend/src/modules/decks/useCases/` | New | Create `DeleteDeckUseCase.ts`. |
| `backend/src/infrastructure/database/` | Modified | Add database migration to include PDF columns and ensure cascading deletes. |
| `frontend/src/features/decks/` | Modified | Update Deck interface, add delete button and confirmation modal. |
| `frontend/src/features/decks/components/` | Modified | Add PDF viewer component (using iframe). |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cloudinary upload failure leaves deck without PDF. | Low | Wrap upload in try/catch and abort deck creation if upload fails. |
| Orphaned Cloudinary files if DB deletion fails. | Low | Wrap deletion in a sequence: DB delete first within transaction (or soft delete) then Cloudinary, or handle Cloudinary delete errors gracefully. |
| Browser does not support native PDF rendering in iframe. | Medium | Provide a fallback link: `<a href={deck.pdfUrl}>Download PDF</a>` inside or next to the iframe. |

## Rollback Plan

- **Database**: Revert the migration adding `pdfUrl` and `pdfPublicId`. Restore from backup if accidental data loss occurs.
- **Backend Code**: Revert changes to `DeckController`, `DeckRouter` and remove `DeleteDeckUseCase`. Remove Cloudinary dependencies.
- **Frontend Code**: Revert UI changes (remove PDF iframe and delete button).

## Dependencies

- **Backend**: `cloudinary` (and optionally `streamifier` if needed for stream uploading).
- **External**: Active Cloudinary account and API credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

## Success Criteria

- [ ] Users can upload a PDF to create a deck and the PDF is stored in Cloudinary.
- [ ] Users can view the uploaded PDF when browsing the deck details.
- [ ] Users can click "Delete", see a confirmation modal, and delete the deck.
- [ ] Deleting the deck successfully removes the deck and all its flashcards from the database.
- [ ] Deleting the deck successfully removes the original PDF asset from Cloudinary.
