import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { marked } from 'marked';
import type { Tokens, Token } from 'marked';
import { INK_COLORS } from '../theme/colors.js';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Renders Markdown content with proper formatting in the terminal.
 * Uses marked's AST for clean parsing.
 *
 * IMPORTANT: In Ink, text must be wrapped in <Text> components.
 * Multiple <Text> components can be siblings in a <Box>.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const elements = useMemo(() => {
    if (!content?.trim()) {
      return [<Text key="empty"> </Text>];
    }

    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    const tokens = marked.lexer(content);
    return tokensToInkElements(tokens);
  }, [content]);

  return <Box flexDirection="column">{elements}</Box>;
}

/**
 * Helper: create a styled Text component for a portion of inline content
 */
function createInlineText(
  key: string,
  text: string,
  options: { bold?: boolean; italic?: boolean; color?: string; strikethrough?: boolean } = {}
): React.ReactNode {
  const { bold, italic, color, strikethrough } = options;

  let displayText = text;
  if (strikethrough) {
    displayText = `~~${text}~~`;
  }

  return (
    <Text key={key} bold={bold} italic={italic} color={color}>
      {displayText}
    </Text>
  );
}

/**
 * Process inline tokens and return an array of <Text> elements
 * that can be placed as siblings in a <Box>
 */
function processInlineTokensToElements(tokens: Token[] | undefined): React.ReactNode[] {
  if (!tokens) return [<Text key="empty"> </Text>];

  const elements: React.ReactNode[] = [];
  let elementIndex = 0;

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const text = token as Tokens.Text;
        if (text.tokens && text.tokens.length > 0) {
          elements.push(...processInlineTokensToElements(text.tokens));
        } else {
          elements.push(createInlineText(`text-${elementIndex++}`, text.text));
        }
        break;
      }

      case 'strong': {
        const strong = token as Tokens.Strong;
        const children = processInlineTokensToElements(strong.tokens);
        elements.push(
          <Text key={`strong-${elementIndex++}`} bold>
            {children}
          </Text>
        );
        break;
      }

      case 'em': {
        const em = token as Tokens.Em;
        const children = processInlineTokensToElements(em.tokens);
        elements.push(
          <Text key={`em-${elementIndex++}`} italic>
            {children}
          </Text>
        );
        break;
      }

      case 'codespan': {
        const codespan = token as Tokens.Codespan;
        elements.push(
          createInlineText(`code-${elementIndex++}`, codespan.text, {
            bold: true,
            color: INK_COLORS.accent,
          })
        );
        break;
      }

      case 'del': {
        const del = token as Tokens.Del;
        const children = processInlineTokensToElements(del.tokens);
        elements.push(
          <Text key={`del-${elementIndex++}`} color={INK_COLORS.error}>
            ~~{children}~~
          </Text>
        );
        break;
      }

      case 'link': {
        const link = token as Tokens.Link;
        const displayText =
          link.href && link.href !== link.text ? `${link.text} (${link.href})` : link.text;
        elements.push(
          createInlineText(`link-${elementIndex++}`, displayText, {
            color: INK_COLORS.secondary,
          })
        );
        break;
      }

      case 'image': {
        const image = token as Tokens.Image;
        const displayText = image.href
          ? `[🖼️ ${image.text}] (${image.href})`
          : `[🖼️ ${image.text}]`;
        elements.push(
          createInlineText(`img-${elementIndex++}`, displayText, {
            color: INK_COLORS.accent,
          })
        );
        break;
      }

      case 'escape': {
        const escape = token as Tokens.Escape;
        elements.push(createInlineText(`escape-${elementIndex++}`, escape.text));
        break;
      }

      default:
        if ('text' in token) {
          const textToken = token as
            | Tokens.Text
            | Tokens.Strong
            | Tokens.Em
            | Tokens.Link
            | Tokens.Image
            | Tokens.Codespan
            | Tokens.Escape;
          if (typeof textToken.text === 'string') {
            elements.push(createInlineText(`unknown-${elementIndex++}`, textToken.text));
          }
        }
    }
  }

  return elements;
}

/**
 * Converts marked AST to Ink elements
 */
function tokensToInkElements(tokens: Token[]): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let keyIndex = 0;

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const heading = token as Tokens.Heading;
        const style = getHeadingStyle(heading.depth);
        const inlineElements = processInlineTokensToElements(heading.tokens);

        elements.push(
          <Box key={`h-${keyIndex}`} flexDirection="column" marginTop={heading.depth === 1 ? 0 : 1}>
            <Box>
              <Text bold color={style.color}>
                {style.prefix}{' '}
              </Text>
              <Text bold>{inlineElements}</Text>
            </Box>
            {style.underline && <Text color={style.color}>{style.underline}</Text>}
          </Box>
        );
        break;
      }

      case 'paragraph': {
        const paragraph = token as Tokens.Paragraph;
        const inlineElements = processInlineTokensToElements(paragraph.tokens);

        elements.push(<Box key={`p-${keyIndex}`}>{inlineElements}</Box>);
        break;
      }

      case 'text': {
        const textToken = token as Tokens.Text;
        if (textToken.tokens && textToken.tokens.length > 0) {
          const inlineElements = processInlineTokensToElements(textToken.tokens);
          elements.push(<Box key={`text-${keyIndex}`}>{inlineElements}</Box>);
        } else {
          elements.push(<Text key={`text-${keyIndex}`}>{textToken.text}</Text>);
        }
        break;
      }

      case 'list': {
        const list = token as Tokens.List;
        const isOrdered = list.ordered;
        let itemCounter = list.ordered ? list.start || 1 : 0;

        for (const item of list.items) {
          const listItem = item;

          if (listItem.task) {
            const bullet = listItem.checked ? '✓' : '○';
            const itemElements = processInlineTokensToElements(
              listItem.tokens.filter(t => t.type !== 'text' || (t as Tokens.Text).text.trim())
            );

            elements.push(
              <Box key={`task-${keyIndex}`}>
                <Text color={INK_COLORS.accent}>
                  {'  '} {bullet}{' '}
                </Text>
                {itemElements}
              </Box>
            );
          } else {
            const nestedLists = listItem.tokens.filter(t => t.type === 'list');
            const textTokens = listItem.tokens.filter(t => t.type !== 'list');

            if (textTokens.length > 0) {
              const bullet = isOrdered ? `${itemCounter}.` : '•';
              const itemElements = processInlineTokensToElements(textTokens);

              elements.push(
                <Box key={`li-${keyIndex}`}>
                  <Text color={INK_COLORS.accent}>
                    {'  '} {bullet}{' '}
                  </Text>
                  {itemElements}
                </Box>
              );
            }

            for (const nestedList of nestedLists) {
              const nestedElements = tokensToInkElements([nestedList]);
              elements.push(...nestedElements);
            }
          }

          if (isOrdered) itemCounter++;
        }
        break;
      }

      case 'code': {
        const code = token as Tokens.Code;
        const language = code.lang || '';
        const codeContent = code.text;

        elements.push(
          <Box key={`code-${keyIndex}`} flexDirection="column" marginY={1}>
            {language && (
              <Text color={INK_COLORS.accent} bold>
                [{language}]
              </Text>
            )}
            <Box borderStyle="single" borderColor={INK_COLORS.border} paddingX={1}>
              <Text>{codeContent}</Text>
            </Box>
          </Box>
        );
        break;
      }

      case 'blockquote': {
        const blockquote = token as Tokens.Blockquote;
        const quoteElements = tokensToInkElements(blockquote.tokens);

        elements.push(
          <Box key={`quote-${keyIndex}`} flexDirection="column" paddingLeft={2}>
            {quoteElements.map((child, childIndex) => (
              <Box key={childIndex}>
                <Text color={INK_COLORS.textSecondary} bold>
                  │{' '}
                </Text>
                {child}
              </Box>
            ))}
          </Box>
        );
        break;
      }

      case 'hr': {
        elements.push(
          <Text key={`hr-${keyIndex}`} color={INK_COLORS.border}>
            {'─'.repeat(60)}
          </Text>
        );
        break;
      }

      case 'table': {
        const table = token as Tokens.Table;
        elements.push(renderTableFromAST(table, keyIndex));
        break;
      }

      case 'space':
        break;

      case 'html': {
        const html = token as Tokens.HTML;
        if (html.text.trim()) {
          elements.push(<Text key={`html-${keyIndex}`}>{html.text}</Text>);
        }
        break;
      }

      default:
        if ('text' in token) {
          const textToken = token as
            | Tokens.Text
            | Tokens.Strong
            | Tokens.Em
            | Tokens.Link
            | Tokens.Image
            | Tokens.Codespan
            | Tokens.Escape;
          if (typeof textToken.text === 'string') {
            elements.push(<Text key={`unknown-${keyIndex++}`}>{textToken.text}</Text>);
          }
        }
    }

    keyIndex++;
  }

  return elements;
}

/**
 * Visual styles for different heading levels
 */
function getHeadingStyle(depth: number) {
  const styles: Record<number, { prefix: string; color: string; underline?: string }> = {
    1: { prefix: '◆', color: INK_COLORS.primary, underline: '━'.repeat(50) },
    2: { prefix: '◇', color: INK_COLORS.secondary },
    3: { prefix: '▸', color: INK_COLORS.accent },
    4: { prefix: '▹', color: INK_COLORS.accent },
    5: { prefix: '‣', color: INK_COLORS.textSecondary },
    6: { prefix: '·', color: INK_COLORS.textSecondary },
  };
  return styles[depth] || styles[3];
}

/**
 * Extract plain text from table cell tokens
 */
function extractCellText(cell: Tokens.TableCell): string {
  if (!cell.tokens || cell.tokens.length === 0) {
    return cell.text;
  }

  let text = '';
  for (const token of cell.tokens) {
    if (token.type === 'text') {
      text += (token as Tokens.Text).text;
    } else if (token.type === 'strong' || token.type === 'em') {
      const inlineToken = token as Tokens.Strong | Tokens.Em;
      if (inlineToken.tokens) {
        text += extractTextFromTokens(inlineToken.tokens);
      }
    } else if (token.type === 'codespan') {
      text += (token as Tokens.Codespan).text;
    } else if ('text' in token) {
      text += (
        token as
          | Tokens.Text
          | Tokens.Strong
          | Tokens.Em
          | Tokens.Link
          | Tokens.Image
          | Tokens.Codespan
          | Tokens.Escape
      ).text;
    }
  }
  return text;
}

/**
 * Extract text from inline tokens
 */
function extractTextFromTokens(tokens: Token[]): string {
  if (!tokens) return '';

  let text = '';
  for (const token of tokens) {
    if ('text' in token) {
      text += (
        token as
          | Tokens.Text
          | Tokens.Strong
          | Tokens.Em
          | Tokens.Link
          | Tokens.Image
          | Tokens.Codespan
          | Tokens.Escape
      ).text;
    }
    if ('tokens' in token) {
      const nestedTokens = (
        token as Tokens.Strong | Tokens.Em | Tokens.Del | Tokens.Link | Tokens.Image | Tokens.Text
      ).tokens;
      if (nestedTokens) {
        text += extractTextFromTokens(nestedTokens);
      }
    }
  }
  return text;
}

/**
 * Render a table from marked AST
 */
function renderTableFromAST(table: Tokens.Table, keyIndex: number): React.ReactNode {
  const rows: string[][] = [];

  const headerRow = table.header.map(cell => extractCellText(cell));
  rows.push(headerRow);

  for (const row of table.rows) {
    const rowData = row.map(cell => extractCellText(cell));
    rows.push(rowData);
  }

  if (rows.length === 0) {
    return <Text key={`table-${keyIndex}`}> </Text>;
  }

  const colCount = Math.max(...rows.map(row => row.length));
  const colWidths: number[] = [];

  for (let col = 0; col < colCount; col++) {
    let maxWidth = 0;
    for (const row of rows) {
      const cellText = row[col] || '';
      maxWidth = Math.max(maxWidth, cellText.length);
    }
    colWidths.push(Math.min(maxWidth + 2, 40));
  }

  const lines: React.ReactNode[] = [];

  lines.push(
    <Text key={`table-top-${keyIndex}`} color={INK_COLORS.border}>
      ┌{colWidths.map(w => '─'.repeat(w + 2)).join('┬')}┐
    </Text>
  );

  if (rows.length > 0) {
    const headerCells = rows[0].map((cell, col) => {
      const width = colWidths[col];
      const paddedText = cell.padEnd(width);
      return `│ ${paddedText} `;
    });

    lines.push(
      <Text key={`table-header-${keyIndex}`} bold color={INK_COLORS.accent}>
        {headerCells.join('')}│
      </Text>
    );

    lines.push(
      <Text key={`table-sep-${keyIndex}`} color={INK_COLORS.border}>
        ├{colWidths.map(w => '─'.repeat(w + 2)).join('┼')}┤
      </Text>
    );
  }

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowCells = row.map((cell, col) => {
      const width = colWidths[col];
      const paddedText = cell.padEnd(width);
      return `│ ${paddedText} `;
    });

    lines.push(<Text key={`table-row-${keyIndex}-${rowIdx}`}>{rowCells.join('')}│</Text>);
  }

  lines.push(
    <Text key={`table-bottom-${keyIndex}`} color={INK_COLORS.border}>
      └{colWidths.map(w => '─'.repeat(w + 2)).join('┴')}┘
    </Text>
  );

  return (
    <Box key={`table-${keyIndex}`} flexDirection="column" marginY={1}>
      {lines}
    </Box>
  );
}
