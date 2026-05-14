import type { SourceLocation, Document, Definition } from '@modeler/parser';
import { DiagnosticCode } from '@modeler/parser';
import type { ResolvedManifest } from './manifest.js';
import { Resolver } from './resolver.js';
import { ProjectSymbolTable } from './project-symbols.js';
import { collectAllReferences } from './references.js';

function enclosingQnameOf(def: Definition, schemaCode: string, namespace: string): string | undefined {
  // Only defs that nest children participate as resolution scopes for bare-id
  // refs: entity/table/view/procedure. Top-level relations/queries/roles
  // don't introduce a scope.
  if (def.kind === 'entity' || def.kind === 'table' || def.kind === 'view' || def.kind === 'procedure') {
    return [schemaCode, namespace, def.name].filter((s) => s !== '').join('.');
  }
  return undefined;
}

export interface ValidationDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source: SourceLocation;
}

export class Validator {
  constructor(
    private symbols: ProjectSymbolTable,
    private resolver: Resolver,
    private manifest: ResolvedManifest
  ) {}

  /**
   * Per-document structural validations: required properties, type presence,
   * nameAttribute/codeAttribute existence on the enclosing entity, primary-key
   * column presence on the enclosing table.
   */
  validateDocument(_uri: string, ast: Document): ValidationDiagnostic[] {
    const diagnostics: ValidationDiagnostic[] = [];

    for (const def of ast.definitions) {
      if (def.kind === 'entity') {
        if (!def.attributes || def.attributes.length === 0) {
          diagnostics.push({
            code: DiagnosticCode.RequiredPropertyMissing,
            severity: 'error',
            message: 'Entity must have at least one attribute',
            source: def.source,
          });
        }

        if (def.nameAttribute && def.attributes) {
          const last = def.nameAttribute.parts[def.nameAttribute.parts.length - 1];
          const exists = def.attributes.some((a) => a.name === last);
          if (!exists) {
            diagnostics.push({
              code: DiagnosticCode.EntityAttributeNotFound,
              severity: 'error',
              message: `nameAttribute '${def.nameAttribute.path}' not found on entity '${def.name}'`,
              source: def.nameAttribute.source,
            });
          }
        }

        if (def.codeAttribute && def.attributes) {
          const last = def.codeAttribute.parts[def.codeAttribute.parts.length - 1];
          const exists = def.attributes.some((a) => a.name === last);
          if (!exists) {
            diagnostics.push({
              code: DiagnosticCode.EntityAttributeNotFound,
              severity: 'error',
              message: `codeAttribute '${def.codeAttribute.path}' not found on entity '${def.name}'`,
              source: def.codeAttribute.source,
            });
          }
        }
      }

      if (def.kind === 'table') {
        if (!def.columns || def.columns.length === 0) {
          diagnostics.push({
            code: DiagnosticCode.RequiredPropertyMissing,
            severity: 'error',
            message: 'Table must have at least one column',
            source: def.source,
          });
        }

        if (def.primaryKey) {
          for (const pkCol of def.primaryKey) {
            const exists = def.columns?.some((c) => c.name === pkCol);
            if (!exists) {
              diagnostics.push({
                code: DiagnosticCode.PrimaryKeyColumnNotFound,
                severity: 'error',
                message: `Primary key column '${pkCol}' not found on table '${def.name}'`,
                source: def.source,
              });
            }
          }
        }
      }

      if (def.kind === 'column' && !def.type) {
        diagnostics.push({
          code: DiagnosticCode.RequiredPropertyMissing,
          severity: 'error',
          message: 'Column must have a type',
          source: def.source,
        });
      }

      if (def.kind === 'attribute' && !def.type) {
        diagnostics.push({
          code: DiagnosticCode.RequiredPropertyMissing,
          severity: 'error',
          message: 'Attribute must have a type',
          source: def.source,
        });
      }

      if (this.manifest.lint.requireDescriptions && !('description' in def && def.description)) {
        diagnostics.push({
          code: DiagnosticCode.RequiredPropertyMissing,
          severity: 'warning',
          message: 'Definition should have a description',
          source: def.source,
        });
      }
    }

    return diagnostics;
  }

  /**
   * Walks every Reference in the document and tries to resolve it against the
   * project-wide symbol table. Each unresolved reference becomes a
   * `ttr/unresolved-reference` diagnostic (Warning by default, Error under
   * `[lint] strict`).
   */
  validateReferences(_uri: string, ast: Document): ValidationDiagnostic[] {
    const diagnostics: ValidationDiagnostic[] = [];
    const schemaCode = ast.schemaDirective?.schemaCode ?? 'db';
    const namespace = ast.schemaDirective?.namespace ?? '';

    for (const { ref, ownerDef } of collectAllReferences(ast)) {
      const enclosingQname = enclosingQnameOf(ownerDef, schemaCode, namespace);
      const res = this.resolver.resolveReference(
        { path: ref.path, parts: ref.parts },
        { schemaCode, namespace, enclosingQname }
      );
      if (!res.resolved) {
        diagnostics.push({
          code: DiagnosticCode.UnresolvedReference,
          severity: this.manifest.lint.strict ? 'error' : 'warning',
          message: `Unresolved reference: '${ref.path}' (tried ${res.tried.join(', ')})`,
          source: ref.source,
        });
      }
    }

    return diagnostics;
  }

  /**
   * Project-wide checks: duplicate-definition diagnostics for any qname
   * defined in more than one document. Each duplicate locus gets its own
   * diagnostic so the user sees a squiggly on every conflicting site.
   */
  validateProject(): ValidationDiagnostic[] {
    const diagnostics: ValidationDiagnostic[] = [];

    for (const dup of this.symbols.duplicates()) {
      for (const entry of dup.entries) {
        const others = dup.entries
          .filter((e) => !(e.documentUri === entry.documentUri && e.source.line === entry.source.line))
          .map((e) => `${e.documentUri}:${e.source.line}`)
          .join(', ');
        diagnostics.push({
          code: DiagnosticCode.DuplicateDefinition,
          severity: 'error',
          message: `Duplicate definition of '${dup.qname}' (also at ${others})`,
          source: entry.source,
        });
      }
    }

    return diagnostics;
  }
}
