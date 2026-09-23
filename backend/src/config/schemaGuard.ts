import { db } from './db';

export interface RequiredColumn {
  table: string;
  column: string;
}

/**
 * Columnas que el código consulta siempre (las que agregaron las migraciones).
 *
 * Sin este chequeo, olvidarse de aplicar una migración se manifiesta como un
 * `500 { error: 'Internal Server Error' }` opaco: Postgres responde 42703
 * (`undefined_column`) y el error handler no tiene nada que decirle al cliente.
 * Pasó con `decks.pdf_source_names` (migrateDeckPdfSources) tras el deploy.
 */
export const REQUIRED_SCHEMA_COLUMNS: readonly RequiredColumn[] = [
  { table: 'decks', column: 'color' },
  { table: 'decks', column: 'shelf_index' },
  { table: 'decks', column: 'position' },
  { table: 'decks', column: 'studied_count' },
  { table: 'decks', column: 'correct_count' },
  { table: 'decks', column: 'pdf_source_names' },
];

/** Columnas requeridas que NO existen (`tabla.columna`), en el orden declarado. */
export async function findMissingColumns(
  required: readonly RequiredColumn[] = REQUIRED_SCHEMA_COLUMNS
): Promise<string[]> {
  const tables = [...new Set(required.map((item) => item.table))];
  const result = await db.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_name = ANY($1::text[])`,
    [tables]
  );
  const present = new Set(result.rows.map((row) => `${row.table_name}.${row.column_name}`));
  return required
    .map((item) => `${item.table}.${item.column}`)
    .filter((key) => !present.has(key));
}

/**
 * Parches DDL idempotentes que el código ya asume en producción.
 * Evita un deploy sin `npm run migrate:deck-pdf-sources` manual (Render no corre migraciones).
 */
const IDEMPOTENT_SCHEMA_PATCHES: readonly string[] = [
  'ALTER TABLE decks ADD COLUMN IF NOT EXISTS pdf_source_names JSONB',
];

export async function applySafeSchemaPatches(): Promise<void> {
  for (const statement of IDEMPOTENT_SCHEMA_PATCHES) {
    await db.query(statement);
  }
}

/**
 * Chequeo de arranque: deja el problema escrito en los logs del servicio
 * (Render/Railway) con el comando exacto a correr. No aborta el proceso a
 * propósito: las rutas que no tocan la columna faltante siguen funcionando.
 */
export async function warnIfSchemaOutdated(): Promise<string[]> {
  try {
    const missing = await findMissingColumns();
    if (missing.length === 0) {
      console.log('✅ Esquema verificado: columnas requeridas presentes.');
      return missing;
    }
    console.error(
      `❌ FALTAN COLUMNAS EN LA BASE DE DATOS: ${missing.join(', ')}\n` +
        '   Las rutas que las usan van a responder 500 { code: SCHEMA_MISMATCH }.\n' +
        '   Aplicá las migraciones pendientes (backend): npm run migrate:deck-pdf-sources\n' +
        '   Listado completo: docs/DEPLOYMENT.md ("Aplicá el esquema y las migraciones").'
    );
    return missing;
  } catch (error) {
    console.error('⚠️ No se pudo verificar el esquema de la base de datos:', error);
    return [];
  }
}
