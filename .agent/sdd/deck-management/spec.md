# Specification: Deck Management

## 1. Technical Specifications

### 1.1 DB Schema Changes
The `decks` table MUST be updated to include fields for storing the PDF URL and its Cloudinary public ID.

**Migration (SQL):**
```sql
ALTER TABLE decks
ADD COLUMN pdf_url VARCHAR(255) NULL,
ADD COLUMN pdf_public_id VARCHAR(255) NULL;
```

**Cascading Deletes:**
The `flashcards` table MUST be verified or updated to cascade deletes when a deck is removed.
```sql
-- If not already present:
ALTER TABLE flashcards
DROP CONSTRAINT IF EXISTS fk_deck,
ADD CONSTRAINT fk_deck FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE;
```

### 1.2 API Contracts

**Endpoint:** `DELETE /api/v1/decks/:id`
- **Method:** `DELETE`
- **Path Parameter:** `id` (string, UUID of the deck)
- **Headers:** `Authorization: Bearer <token>`
- **Response (Success - 204 No Content):**
  *Empty body*
- **Response (Not Found - 404):**
  ```json
  {
    "error": "Deck not found"
  }
  ```
- **Response (Forbidden - 403):**
  ```json
  {
    "error": "You do not have permission to delete this deck"
  }
  ```

### 1.3 Domain Interfaces

**Updates to `IDeckRepository`:**
```typescript
export interface IDeckRepository {
  // Existing methods...
  delete(deckId: string): Promise<void>;
  findById(deckId: string): Promise<Deck | null>;
}
```

**New `ICloudStoragePort`:**
```typescript
export interface ICloudStoragePort {
  uploadPdf(fileBuffer: Buffer): Promise<{ url: string; publicId: string }>;
  deletePdf(publicId: string): Promise<void>;
}
```

### 1.4 Frontend Props Interfaces

**PDF Viewer Component:**
```typescript
export interface PdfViewerProps {
  pdfUrl: string;
  title?: string;
  fallbackText?: string;
}
```

**Deck Delete Button Component:**
```typescript
export interface DeckDeleteButtonProps {
  deckId: string;
  onDeleteSuccess: () => void;
  onDeleteError?: (error: Error) => void;
}
```

## 2. Behavioral Requirements (Delta Specs)

### Domain: Deck Deletion

#### ADDED Requirements

##### Requirement: Delete Deck
The system MUST allow an authenticated user to delete a deck they own, which SHOULD trigger the deletion of associated flashcards and the remote PDF file.

###### Scenario: Successful Deck Deletion
- GIVEN the user is authenticated and owns the deck with ID "123"
- AND the deck has an associated PDF in Cloudinary and flashcards in the database
- WHEN the user sends a DELETE request to `/api/v1/decks/123`
- THEN the system MUST delete the PDF asset from Cloudinary
- AND the system MUST delete the deck and its flashcards from the database
- AND the system MUST return a 204 No Content response

###### Scenario: Attempt to Delete Unowned Deck
- GIVEN the user is authenticated but does not own the deck with ID "123"
- WHEN the user sends a DELETE request to `/api/v1/decks/123`
- THEN the system MUST NOT delete the deck
- AND the system MUST return a 403 Forbidden response

###### Scenario: Attempt to Delete Non-Existent Deck
- GIVEN the deck with ID "999" does not exist
- WHEN the user sends a DELETE request to `/api/v1/decks/999`
- THEN the system MUST return a 404 Not Found response

### Domain: PDF Storage & Visualization

#### MODIFIED Requirements

##### Requirement: Generate Deck with PDF Storage
The system MUST store the uploaded PDF file to Cloudinary during deck generation and persist its URL.
*(Previously: The system only kept the PDF in memory to generate flashcards and discarded it).*

###### Scenario: Successful PDF Upload and Deck Generation
- GIVEN the user uploads a valid PDF file for deck generation
- WHEN the system processes the request
- THEN the system MUST upload the PDF to Cloudinary
- AND the system MUST save the `pdfUrl` and `pdfPublicId` to the newly created deck in the database
- AND the system MUST return the generated deck including the `pdfUrl`

###### Scenario: Cloudinary Upload Failure
- GIVEN the user uploads a valid PDF file for deck generation
- AND Cloudinary is unreachable or returns an error
- WHEN the system attempts to upload the PDF
- THEN the system MUST abort the deck creation
- AND the system MUST return a 500 Internal Server Error (or a specific bad gateway error)

#### ADDED Requirements

##### Requirement: View PDF
The frontend system MUST provide a component to visualize the stored PDF alongside the deck details.

###### Scenario: Rendering PDF Viewer
- GIVEN the user is viewing a deck that has a `pdfUrl`
- WHEN the deck detail page loads
- THEN the page MUST render a `PdfViewer` component
- AND the `PdfViewer` MUST embed the PDF using an iframe pointing to the `pdfUrl`
