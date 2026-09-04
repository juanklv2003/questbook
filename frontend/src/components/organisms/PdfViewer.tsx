import { FileText } from "lucide-react"

export interface PdfViewerProps {
  pdfUrl: string
  title?: string
  fallbackText?: string
}

/**
 * Only image-type Cloudinary PDF URLs (`.../image/upload/...pdf`) are served
 * with an inline disposition and are safe to embed. Decks stored before the
 * upload fix use extensionless raw URLs (`.../raw/upload/...`) which Cloudinary
 * serves as attachments — iframing those makes the browser download the file
 * as soon as the study view mounts. Never embed those: entering a deck must
 * open the study session without downloading anything.
 */
export function isInlineViewablePdfUrl(pdfUrl: string): boolean {
  if (!pdfUrl) return false;
  if (!pdfUrl.includes("cloudinary.com")) return true;
  if (pdfUrl.includes("/raw/upload/") && !/\.pdf(\?|#|$)/i.test(pdfUrl)) return false;
  return true;
}

function toEmbedUrl(pdfUrl: string): string {
  const hashIndex = pdfUrl.indexOf("#");
  if (hashIndex === -1) return `${pdfUrl}#toolbar=0`;
  return pdfUrl;
}

export function PdfViewer({ pdfUrl, title, fallbackText = "Este documento no se puede previsualizar en el navegador, pero podés estudiar con tus tarjetas sin problema." }: PdfViewerProps) {
  if (!isInlineViewablePdfUrl(pdfUrl)) {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col border rounded-lg overflow-hidden bg-muted/10">
        {title && (
          <div className="p-3 border-b bg-muted/30 font-medium text-sm">
            {title}
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
            <FileText className="w-7 h-7 text-primary/40" />
          </div>
          <p className="text-sm font-medium">Vista previa no disponible</p>
          <p className="text-sm text-muted-foreground max-w-sm">{fallbackText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col border rounded-lg overflow-hidden bg-muted/10">
      {title && (
        <div className="p-3 border-b bg-muted/30 font-medium text-sm">
          {title}
        </div>
      )}
      <iframe
        src={toEmbedUrl(pdfUrl)}
        className="flex-1 w-full border-none"
        title={title || "PDF Viewer"}
      >
        <p>{fallbackText}</p>
      </iframe>
    </div>
  )
}
