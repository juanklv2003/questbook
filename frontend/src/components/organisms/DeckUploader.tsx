import * as React from "react"
import { UploadCloud, BrainCircuit, Loader2 } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageContext"
import type { DeckGenerationOptions, Difficulty } from "../../types"

export interface DeckUploaderProps {
  onUpload: (file: File, options: DeckGenerationOptions) => void;
  isGenerating: boolean;
  progress: number;
  isAiProcessing?: boolean;
}

const CARD_COUNT_OPTIONS = [10, 20, 30, 40, 50];

export function DeckUploader({ onUpload, isGenerating, progress, isAiProcessing = false }: DeckUploaderProps) {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [deckName, setDeckName] = React.useState('');
  const [cardCount, setCardCount] = React.useState<number>(10);
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');
  const [color, setColor] = React.useState<string>('primary');
  const [language, setLanguage] = React.useState<'en' | 'es'>('es');

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = deckName.trim() || file.name.replace('.pdf', '');
      onUpload(file, { name, cardCount, difficulty, color, language });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const name = deckName.trim() || file.name.replace('.pdf', '');
      onUpload(file, { name, cardCount, difficulty, color, language });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      {/* Generation options */}
      <div className="flex flex-col gap-4 p-4 rounded-xl border bg-card">
        <h4 className="text-sm font-medium text-muted-foreground">{t("up.config")}</h4>

        {/* Deck name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="deck-name" className="text-sm font-medium">{t("up.name")}</label>
          <input
            id="deck-name"
            data-autofocus
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            placeholder={t("up.namePlaceholder")}
            className="w-full px-3 py-2 rounded-lg text-sm border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground">{t("up.nameHint")}</p>
        </div>

        {/* Card count */}
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

        {/* Difficulty */}
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

        {/* Color */}
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

      {/* Language — card generation language (not interface language) */}
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

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={isGenerating ? -1 : 0}
        aria-label={t("up.dropAria")}
        aria-disabled={isGenerating}
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
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
          className="hidden"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">{t("up.dropTitle")}</h3>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              {t("up.dropHint")}
            </p>
          </div>
        </div>
      </div>

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
