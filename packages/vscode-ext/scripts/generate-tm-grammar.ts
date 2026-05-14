#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tokens = [
  // Keywords
  'DEF', 'SCHEMA', 'NAMESPACE', 'DB', 'ER', 'MAP', 'CNC',
  'MODEL', 'TABLE', 'VIEW', 'COLUMN', 'INDEX', 'CONSTRAINT', 'FK',
  'PROCEDURE', 'ENTITY', 'ATTRIBUTE', 'RELATION',
  'ER2DB_ENTITY', 'ER2DB_ATTRIBUTE', 'ER2DB_RELATION',
  'QUERY', 'ROLE', 'ER2CNC_ROLE',
  'DESCRIPTION', 'TAGS', 'VERSION', 'PRIMARY_KEY', 'COLUMNS',
  'INDICES', 'CONSTRAINTS', 'ATTRIBUTES', 'PARAMETERS',
  'RESULT_COLUMNS', 'DEFINITION_SQL', 'DATA_TYPE', 'OPTIONAL',
  'IS_KEY', 'SEARCHABLE', 'INDEXED', 'LABEL_PLURAL',
  'NAME_ATTRIBUTE', 'CODE_ATTRIBUTE', 'ALIASES', 'CARDINALITY',
  'JOIN', 'TARGET', 'WHERE_FILTER', 'LANGUAGE', 'SOURCE_TEXT',
  'LENGTH', 'PRECISION', 'LABEL', 'NAME', 'DIRECTION',
  'DISPLAY_LABEL', 'VALUE_LABELS', 'ROLES',
  'SEARCH', 'KEYWORDS', 'PATTERNS', 'DESCRIPTIONS', 'EXAMPLES',
  'FROM', 'TO',
  'TEXT', 'INT', 'FLOAT', 'BOOL', 'DATETIME', 'STRING',
  'BOOLEAN', 'NUMBER', 'INTEGER', 'DOUBLE', 'OBJECT', 'LIST',
  'CHAR', 'VARCHAR', 'DECIMAL', 'DATE', 'TIMESTAMP',
  'PRIMARY', 'SECONDARY', 'ORDERED', 'BTREE', 'FULLTEXT',
  'UNIQUE', 'NOT_NULL',
  'SQL', 'TRANSFORMATION_DSL', 'DATAFRAME_DSL', 'REL_NODE',
];

const keywordPatterns = tokens.map(t => {
  const name = t.toLowerCase().replace(/_/g, '');
  return `        { key: '${name}', value: '${name.toLowerCase()}' }`;
}).join(',\n');

const grammar = {
  name: 'TTR',
  fileTypes: ['ttr'],
  scopeName: 'source.ttr',
  patterns: [
    { include: '#comments' },
    { include: '#strings' },
    { include: '#numbers' },
    { include: '#keywords' },
    { include: '#operators' },
  ],
  repository: {
    comments: {
      patterns: [
        {
          name: 'comment.line.double-slash.ttr',
          match: '//.*$',
        },
        {
          name: 'comment.block.ttr',
          begin: '/\\*',
          end: '\\*/',
        },
      ],
    },
    strings: {
      patterns: [
        {
          name: 'string.quoted.double.ttr',
          begin: '"',
          end: '"(?=[^\\\\])',
          patterns: [
            { name: 'constant.character.escape.ttr', match: '\\\\.' },
          ],
        },
      ],
    },
    numbers: {
      patterns: [
        {
          name: 'constant.numeric.ttr',
          match: '-?[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?',
        },
      ],
    },
    keywords: {
      patterns: [
        {
          name: 'keyword.control.ttr',
          match: '\\b(def|schema|namespace|primaryKey|columns|indices|constraints|attributes|from|to|join|type|search|keywords|patterns|descriptions|examples)\\b',
        },
        {
          name: 'keyword.entity.ttr',
          match: '\\b(db|er|map|cnc|model|table|view|column|index|constraint|fk|procedure|entity|attribute|relation|query|role|er2db_entity|er2db_attribute|er2db_relation|er2cnc_role|description|tags|version|optional|isKey|searchable|indexed|labelPlural|nameAttribute|codeAttribute|aliases|cardinality|target|whereFilter|language|sourceText|length|precision|label|name|direction|displayLabel|valueLabels|roles|search|examples)\\b',
        },
        {
          name: 'keyword.type.ttr',
          match: '\\b(text|int|float|bool|datetime|string|boolean|number|integer|double|object|list|char|varchar|decimal|date|timestamp|primary|secondary|ordered|btree|fulltext|unique|notNull|SQL|TRANSFORMATION_DSL|DATAFRAME_DSL|REL_NODE)\\b',
        },
      ],
    },
    operators: {
      patterns: [
        { name: 'punctuation.equals.ttr', match: '=' },
        { name: 'punctuation.colon.ttr', match: ':' },
        { name: 'punctuation.comma.ttr', match: ',' },
        { name: 'punctuation.braces.ttr', match: '[{}]' },
        { name: 'punctuation.brackets.ttr', match: '[\\[\\]]' },
        { name: 'punctuation.parenthesis.ttr', match: '[()]' },
        { name: 'punctuation.dot.ttr', match: '\\.' },
      ],
    },
  },
};

const outputPath = path.join(__dirname, '../syntaxes/ttr.tmLanguage.json');
fs.writeFileSync(outputPath, JSON.stringify(grammar, null, 2));
console.log(`Generated TextMate grammar to ${outputPath}`);