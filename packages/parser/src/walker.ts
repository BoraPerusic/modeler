import {
  CharStream,
  CommonTokenStream,
  ANTLRErrorListener,
  RecognitionException,
  Recognizer,
  Token,
  ATNSimulator,
} from 'antlr4ng';
import { TTRLexer } from './generated/TTRLexer.js';
import { TTRParser, DocumentContext, DefinitionContext, SchemaDirectiveContext } from './generated/TTRParser.js';
import type {
  SourceLocation,
  Document,
  Definition,
  ParseError,
  ParseResult,
  SchemaDirective,
  ModelDef,
  TableDef,
  ViewDef,
  ColumnDef,
  IndexDef,
  ConstraintDef,
  FkDef,
  ProcedureDef,
  EntityDef,
  AttributeDef,
  RelationDef,
  Er2dbEntityDef,
  Er2dbAttributeDef,
  Er2dbRelationDef,
  QueryDef,
  RoleDef,
  Er2cncRoleDef,
} from './ast.js';
import { DiagnosticCode } from './diagnostics.js';

class DiagnosticErrorListener implements ANTLRErrorListener {
  private errors: ParseError[];
  private fileLabel: string;

  constructor(errors: ParseError[], fileLabel: string) {
    this.errors = errors;
    this.fileLabel = fileLabel;
  }

  syntaxError(
    _recognizer: Recognizer<ATNSimulator>,
    _offendingSymbol: Token | null,
    line: number,
    charPositionInLine: number,
    msg: string,
    _e: RecognitionException | null
  ): void {
    const symbol = _offendingSymbol;
    this.errors.push({
      code: DiagnosticCode.ParseError,
      message: msg,
      severity: 'error',
      source: {
        file: this.fileLabel,
        line,
        column: charPositionInLine,
        endLine: line,
        endColumn: charPositionInLine + (symbol?.stop ? symbol.stop - symbol.start + 1 : 1),
        offsetStart: symbol?.start ?? 0,
        offsetEnd: symbol ? symbol.stop + 1 : 0,
      },
    });
  }

  reportAmbiguity(
    _recognizer: Recognizer<ATNSimulator>,
    _dfa: unknown,
    _startIndex: number,
    _stopIndex: number,
    _exact: boolean,
    _ambigAlts: unknown,
    _configs: unknown
  ): void {
    // No-op for now - Phase 1 feature
  }

  reportAttemptingFullContext(
    _recognizer: Recognizer<ATNSimulator>,
    _dfa: unknown,
    _startIndex: number,
    _stopIndex: number,
    _conflictingAlts: unknown,
    _configs: unknown
  ): void {
    // No-op for now - Phase 1 feature
  }

  reportContextSensitivity(
    _recognizer: Recognizer<ATNSimulator>,
    _dfa: unknown,
    _startIndex: number,
    _stopIndex: number,
    _prediction: number,
    _configs: unknown
  ): void {
    // No-op for now - Phase 1 feature
  }
}

export function parseString(content: string, fileLabel = '<string>'): ParseResult {
  const inputStream = CharStream.fromString(content);
  const lexer = new TTRLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new TTRParser(tokenStream);

  const errors: ParseError[] = [];

  lexer.removeErrorListeners();
  parser.removeErrorListeners();

  const lexerErrorListener = new DiagnosticErrorListener(errors, fileLabel);
  const parserErrorListener = new DiagnosticErrorListener(errors, fileLabel);

  lexer.addErrorListener(lexerErrorListener);
  parser.addErrorListener(parserErrorListener);

  try {
    const tree = parser.document();
    const doc = walkDocument(tree, fileLabel);
    return {
      ast: doc,
      errors,
      sourceFile: fileLabel,
    };
  } catch (e) {
    return {
      errors: [
        ...errors,
        {
          message: e instanceof Error ? e.message : 'Unknown parse error',
          severity: 'error',
          source: { file: fileLabel, line: 1, column: 1, endLine: 1, endColumn: 1, offsetStart: 0, offsetEnd: 0 },
        },
      ],
      sourceFile: fileLabel,
    };
  }
}

export async function parseFile(filePath: string): Promise<ParseResult> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseString(content, filePath);
}

function walkDocument(ctx: DocumentContext, file: string): Document {
  const schemaCtx = ctx.schemaDirective();
  const defContexts = ctx.definition();

  const definitions: Definition[] = defContexts.map((defCtx: DefinitionContext) =>
    walkDefinition(defCtx, file)
  );

  return {
    schemaDirective: schemaCtx ? walkSchemaDirective(schemaCtx, file) : undefined,
    definitions,
    source: makeSourceLocation(ctx, file),
  };
}

function walkSchemaDirective(ctx: SchemaDirectiveContext, file: string): SchemaDirective {
  const schemaCodeCtx = ctx.schemaCode();
  const namespaceCtx = ctx.id();

  let schemaCode = '';
  if (schemaCodeCtx.DB()) schemaCode = 'db';
  else if (schemaCodeCtx.ER()) schemaCode = 'er';
  else if (schemaCodeCtx.MAP()) schemaCode = 'map';
  else if (schemaCodeCtx.QUERY()) schemaCode = 'query';
  else if (schemaCodeCtx.CNC()) schemaCode = 'cnc';

  return {
    schemaCode,
    namespace: namespaceCtx ? namespaceCtx.getText() : undefined,
    source: makeSourceLocation(ctx, file),
  };
}

function walkDefinition(ctx: DefinitionContext, file: string): Definition {
  const objDef = ctx.objectDefinition();
  const nameCtx = objDef.id();
  const name = nameCtx ? nameCtx.getText() : '';
  const source = makeSourceLocation(ctx, file);

  if (objDef.MODEL()) return { kind: 'model', name, source } satisfies ModelDef;
  if (objDef.TABLE()) return { kind: 'table', name, source } satisfies TableDef;
  if (objDef.VIEW()) return { kind: 'view', name, source } satisfies ViewDef;
  if (objDef.COLUMN()) return { kind: 'column', name, source } satisfies ColumnDef;
  if (objDef.INDEX()) return { kind: 'index', name, source } satisfies IndexDef;
  if (objDef.CONSTRAINT()) return { kind: 'constraint', name, source } satisfies ConstraintDef;
  if (objDef.FK()) return { kind: 'fk', name, source } satisfies FkDef;
  if (objDef.PROCEDURE()) return { kind: 'procedure', name, source } satisfies ProcedureDef;
  if (objDef.ENTITY()) return { kind: 'entity', name, source } satisfies EntityDef;
  if (objDef.ATTRIBUTE()) return { kind: 'attribute', name, source } satisfies AttributeDef;
  if (objDef.RELATION()) return { kind: 'relation', name, source } satisfies RelationDef;
  if (objDef.ER2DB_ENTITY()) return { kind: 'er2dbEntity', name, source } satisfies Er2dbEntityDef;
  if (objDef.ER2DB_ATTRIBUTE()) return { kind: 'er2dbAttribute', name, source } satisfies Er2dbAttributeDef;
  if (objDef.ER2DB_RELATION()) return { kind: 'er2dbRelation', name, source } satisfies Er2dbRelationDef;
  if (objDef.QUERY()) return { kind: 'query', name, source } satisfies QueryDef;
  if (objDef.ROLE()) return { kind: 'role', name, source } satisfies RoleDef;
  if (objDef.ER2CNC_ROLE()) return { kind: 'er2cncRole', name, source } satisfies Er2cncRoleDef;

  return { kind: 'model', name, source } satisfies ModelDef;
}

function makeSourceLocation(
  ctx: { start?: { line: number; column: number; start: number } | null; stop?: { line: number; column: number; start: number; stop: number } | null },
  file: string
): SourceLocation {
  const startToken = ctx.start ?? { line: 1, column: 0, start: 0 };
  const stopToken = ctx.stop ?? { line: startToken.line, column: startToken.column, start: startToken.start, stop: startToken.start - 1 };
  const stopTokenLength = stopToken.stop - stopToken.start + 1;
  return {
    file,
    line: startToken.line,
    column: startToken.column,
    endLine: stopToken.line,
    endColumn: stopToken.column + stopTokenLength,
    offsetStart: startToken.start,
    offsetEnd: stopToken.stop + 1,
  };
}