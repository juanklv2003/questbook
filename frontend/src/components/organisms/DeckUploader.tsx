import * as React from "react"
import { UploadCloud, BrainCircuit, Loader2, FileText, X, Plus } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageContext"
import type { DeckGenerationOptions, Difficulty } from "../../types"
import { Button } from "../atoms/Button"
import {
  formatCharCount,
  getDeckSourceTextCap,
  getMaxPdfBytes,
  loadUploadLimits,
  formatMaxPdfMb,
} from "../../lib/uploadConfig"
import { fetchPdfCharacterCount } from "../../lib/pdfTextStats"

export interface DeckUploaderProps {
  onUpload: (files: File[], options: DeckGenerationOptions) => void;
  isGenerating: boolean;
  progress: number;
  isAiProcessing?: boolean;
}

const CARD_COUNT_OPTIONS = [10, 20, 30, 40, 50];

type QueuedPdf = {
  id: string;
  file: File;
  characters: number | null;
  loading: boolean;
  error?: string;
};

export function DeckUploader({ onUpload, isGenerating, progress, isAiProcessing = false }: DeckUploaderProps) {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [deckName, setDeckName] = React.useState('');
  const [cardCount, setCardCount] = React.useState<number>(10);
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [color, setColor] = React.useState<string>('primary');
  const [language, setLanguage] = React.useState<'en' | 'es'>('es');
  const [queue, setQueue] = React.useState<QueuedPdf[]>([]);
  const [textCap, setTextCap] = React.useState(() => getDeckSourceTextCap());

  React.useEffect(() => {
    void loadUploadLimits().then(() => setTextCap(getDeckSourceTextCap()));
  }, []);

  const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
    { value: 'easy', label: t("up.easy"), description: t("up.easyDesc") },
    { value: 'medium', label: t("up.medium"), description: t("up.mediumDesc") },
    { value: 'hard', label: t("up.hard"), description: t("up.hardDesc") },
  ];

  const COLOR_OPTIONS: { value: string; label: string; swatch: string }[] = [
    { value: 'primary', label: t("up.blue"), swatch: 'bg-primary' },
    { value: 'violet', label: t("up.violet"), swatch: 'bg-violet-600' },
    { value: 'emerald', label: t("up.green"), swatch: 'bg-emerald-600' },
    { value: 'amber', label: t("up.amber"), swatch: 'bg-amber-600' },
    { value: 'rose', label: t("up.rose"), swatch: 'bg-rose-600' },
  ];

  const enqueueFiles = React.useCallback(async (incoming: FileList | File[]) => {
    const list = Array.from(incoming).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (list.length === 0) return;

    const maxBytes = getMaxPdfBytes();
    const maxMb = formatMaxPdfMb();

    for (const file of list) {
      if (file.size > maxBytes) {
        setQueue((prev) => [
          ...prev,
          {
            id: `${file.name}-${file.size}-${Date.now()}`,
            file,
            characters: null,
            loading: false,
            error: t('gen.fileTooLarge', { maxMb: String(maxMb) }),
          },
        ]);
        continue;
      }

      const id = `${file.name}-${file.size}-${crypto.randomUUID()}`;
      setQueue((prev) => [...prev, { id, file, characters: null, loading: true }]);

      try {
        const characters = await fetchPdfCharacterCount(file);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, characters, loading: false } : item
          )
        );
      } catch {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, loading: false, error: t('gen.pdfNoText') }
              : item
          )
        );
      }
    }
  }, [t]);

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCharacters = queue.reduce((sum, item) => sum + (item.characters ?? 0), 0);
  const cap = textCap;
  const usedForBar = Math.min(totalCharacters, cap);
  const barPercent = cap > 0 ? Math.min(100, Math.round((usedForBar / cap) * 100)) : 0;
  const overCap = totalCharacters > cap;
  const hasLoading = queue.some((q) => q.loading);
  const hasValidPdf = queue.some((q) => !q.error && (q.characters ?? 0) > 0);
  const canGenerate = hasValidPdf && !hasLoading && !isGenerating;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      void enqueueFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.length) {
      void enqueueFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleGenerate = () => {
    const files = queue.filter((q) => !q.error && (q.characters ?? 0) > 0).map((q) => q.file);
    if (files.length === 0) return;
    const fallbackName = files.length === 1
      ? files[0].name.replace(/\.pdf$/i, '')
      : t('up.multiPdfBookName');
    const name = deckName.trim() || fallbackName;
    onUpload(files, { name, cardCount, difficulty, color, language });
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-4 p-4 rounded-xl border bg-card">
        <h4 className="text-sm font-medium text-muted-foreground">{t("up.config")}</h4>

        <div className="flex flex-col gap-2">
          <label htmlFor="deck-name" className="text-sm font-medium">{t("up.name")}</label>
          <input
            id="deck-name"
            data-autofocus
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder={t("up.namePlaceholder")}
            className="w-full px-3 py-2 rounded-lg text-sm border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground">{t("up.nameHint")}</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-medium">{t("up.charBudget")}</label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatCharCount(totalCharacters)} / {formatCharCount(cap)} {t("up.chars")}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-secondary/60"
            role="progressbar"
            aria-valuenow={barPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("up.charBudgetAria", { used: formatCharCount(usedForBar), cap: formatCharCount(cap) })}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${overCap ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${barPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {overCap ? t("up.charBudgetOver") : t("up.charBudgetHint")}
          </p>
        </div>

        {queue.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label={t("up.pdfQueueAria")}>
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm"
              >
                <FileText className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.file.name}</p>
                  {item.loading ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      {t("up.measuringPdf")}
                    </p>
                  ) : item.error ? (
                    <p className="text-xs text-destructive mt-0.5">{item.error}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {formatCharCount(item.characters ?? 0)} {t("up.chars")}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeFromQueue(item.id)}
                  disabled={isGenerating}
                  aria-label={t("up.removePdf")}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t("up.count")}</label>
          <div className="flex gap-2">
            {CARD_COUNT_OPTIONS.map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setCardCount(count)}
                aria-pressed={cardCount === count}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  cardCount === count
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t("up.difficulty")}</label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDifficulty(option.value)}
                aria-pressed={difficulty === option.value}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  difficulty === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="block">{option.label}</span>
                <span className={`block text-xs mt-0.5 ${
                  difficulty === option.value ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span id="deck-color-label" className="text-sm font-medium">{t("up.color")}</span>
          <div className="flex gap-2" role="group" aria-labelledby="deck-color-label">
            {COLOR_OPTIONS.map(option => {
              const selected = color === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  aria-pressed={selected}
                  title={option.label}
                  aria-label={t("up.colorOption", { label: option.label })}
                  className={`flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                    selected
                      ? 'bg-secondary ring-2 ring-primary ring-offset-2 ring-offset-card'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <span aria-hidden="true" className={`h-6 w-6 rounded-full ${option.swatch}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t("up.language")}</label>
          <div className="flex gap-2">
            {([
              { value: 'en', label: t("lang.english") },
              { value: 'es', label: t("lang.spanish") },
            ] as const).map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                aria-pressed={language === option.value}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  language === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="block">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        role="button"
        tabIndex={isGenerating ? -1 : 0}
        aria-label={t("up.dropAria")}
        aria-disabled={isGenerating}
        className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-card hover:bg-accent/50"
        } ${isGenerating ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isGenerating) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">{t("up.dropTitleMulti")}</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              {t("up.dropHintMulti")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t("up.addPdf")}
          </span>
        </div>
      </div>

      <Button
        type="button"
        className="w-full h-12"
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        {t("up.createBook")}
      </Button>

      {isGenerating && (
        <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              {isAiProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  {t("up.aiGenerating")}
                </>
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4 text-primary" />
                  {t("up.uploading")}
                </>
              )}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary transition-all duration-300 ease-out ${isAiProcessing ? "animate-pulse" : ""}`}
              style={{ width: `${Math.min(progress, 95)}%` }}
            />
          </div>
          {isAiProcessing && (
            <p className="text-xs text-muted-foreground text-center">
              {t("up.slowNote")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
