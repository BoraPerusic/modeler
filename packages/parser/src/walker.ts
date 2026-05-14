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
  DefinitionKind,
  ParseError,
  ParseResult,
  SchemaDirective,
} from './ast.js';

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
    this.errors.push({
      message: msg,
      severity: 'error',
      source: {
        file: this.fileLabel,
        line,
        column: charPositionInLine,
        endLine: line,
        endColumn: charPositionInLine + 1,
        offsetStart: 0,
        offsetEnd: 0,
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

  let kind: DefinitionKind = 'model';

  if (objDef.MODEL()) kind = 'model';
  else if (objDef.TABLE()) kind = 'table';
  else if (objDef.VIEW()) kind = 'view';
  else if (objDef.COLUMN()) kind = 'column';
  else if (objDef.INDEX()) kind = 'index';
  else if (objDef.CONSTRAINT()) kind = 'constraint';
  else if (objDef.FK()) kind = 'fk';
  else if (objDef.PROCEDURE()) kind = 'procedure';
  else if (objDef.ENTITY()) kind = 'entity';
  else if (objDef.ATTRIBUTE()) kind = 'attribute';
  else if (objDef.RELATION()) kind = 'relation';
  else if (objDef.ER2DB_ENTITY()) kind = 'er2dbEntity';
  else if (objDef.ER2DB_ATTRIBUTE()) kind = 'er2dbAttribute';
  else if (objDef.ER2DB_RELATION()) kind = 'er2dbRelation';
  else if (objDef.QUERY()) kind = 'query';
  else if (objDef.ROLE()) kind = 'role';
  else if (objDef.ER2CNC_ROLE()) kind = 'er2cncRole';

  return {
    kind,
    name,
    source: makeSourceLocation(ctx, file),
  };
}

function makeSourceLocation(
  ctx: { start: { line: number; column: number } | null; stop?: { line: number; column: number } | null },
  file: string
): SourceLocation {
  const start = ctx.start ?? { line: 1, column: 1 };
  const end = ctx.stop ?? start;
  return {
    file,
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column + 1,
    offsetStart: 0,
    offsetEnd: 0,
  };
}