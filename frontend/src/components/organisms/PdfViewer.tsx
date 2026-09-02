export interface PdfViewerProps {
  pdfUrl: string
  title?: string
  fallbackText?: string
}

export function PdfViewer({ pdfUrl, title, fallbackText = "No se pudo cargar el PDF." }: PdfViewerProps) {
  return (
    <div className="w-full h-full min-h-[600px] flex flex-col border rounded-lg overflow-hidden bg-muted/10">
      {title && (
        <div className="p-3 border-b bg-muted/30 font-medium text-sm">
          {title}
        </div>
      )}
      <iframe
        src={`${pdfUrl}#toolbar=0`}
        className="flex-1 w-full border-none"
        title={title || "PDF Viewer"}
      >
        <p>{fallbackText}</p>
      </iframe>
    </div>
  )
}
