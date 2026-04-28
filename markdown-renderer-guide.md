# Markdown Renderer for Ink TUI - Implementation Guide

## Problem Solved

The original `MessageBubble` component rendered markdown content as plain text:

```tsx
<Text>{content}</Text>
```

This meant all Markdown syntax (`**bold**`, `*italic*`, `# headings`, etc.) was displayed literally without any formatting.

## Solution Implemented

Created a comprehensive `MarkdownRenderer` component at:
`packages/tui/src/components/MarkdownRenderer.tsx`

### How It Works

1. **Parses Markdown to AST**: Uses the `marked` library to convert Markdown string → Abstract Syntax Tree
2. **Converts AST to Ink Elements**: Walks through the tree and creates React components for each element
3. **Renders with proper styling**: Each Markdown element gets appropriate terminal styling

### Supported Elements & Visual Translation

| Markdown Element    | Terminal Rendering                       |
| ------------------- | ---------------------------------------- |
| `# Heading 1`       | `◆ Heading 1` with red color + underline |
| `## Heading 2`      | `◇ Heading 2` with blue color            |
| `### Heading 3`     | `▸ Heading 3` with accent color          |
| `#### Heading 4`    | `▹ Heading 4` with accent color          |
| `##### Heading 5`   | `‣ Heading 5` with secondary color       |
| `###### Heading 6`  | `· Heading 6` with secondary color       |
| `**bold**`          | Bold text                                |
| `*italic*`          | Italic text                              |
| `~~strikethrough~~` | `~~text~~` in error color                |
| `` `code` ``        | Code in accent color + bold              |
| ` ```lang ... ``` ` | Code block with border + language label  |
| `- item`            | `  • item`                               |
| `1. item`           | `  1. item`                              |
| `- [x] done`        | `  ✓ done`                               |
| `- [ ] todo`        | `  ○ todo`                               |
| Nested lists        | Indented with proper spacing             |
| `> quote`           | `│ quote` in secondary color             |
| `>> nested`         | `│ │ nested`                             |
| `[text](url)`       | `text (url)` in secondary color          |
| `![alt](url)`       | `[🖼️ alt] (url)`                         |
| Tables              | Bordered tables with header highlighting |
| `---`               | `──────────────` (60 dashes)             |

### Usage in MessageBubble

```tsx
import { MarkdownRenderer } from './MarkdownRenderer.js';

// In MessageBubble for assistant messages:
<Box flexDirection="column">
  <Text bold color={INK_COLORS.success}>
    Agente:
  </Text>
  <Box paddingLeft={2}>
    <MarkdownRenderer content={content} />
  </Box>
</Box>;
```

### Example Output

```
◆ LocalCode - Tu Asistente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este es un texto en negrita, un texto en cursiva, y
un ~~texto tachado~~.

  • Primer elemento
  • Segundo elemento con negrita
  ✓ Tarea completada
  ○ Tarea pendiente

[typescript]
┌──────────────────────────────────────────────┐
│ function hello() {                           │
│   console.log("Hello!");                     │
│ }                                            │
└──────────────────────────────────────────────┘

┌────────┬──────────────┬─────────┐
│ Nombre │ Email        │ Rol     │
├────────┼──────────────┼─────────┤
│ Ana    │ ana@test.com │ Admin   │
│ Bob    │ bob@test.com │ User    │
└────────┴──────────────┴─────────┘
```

### Technical Notes

- **Ink Limitation**: Ink requires all text to be inside `<Text>` components
- **No Nested Text**: `<Text>` components cannot contain other `<Text>` components
- **Solution**: Build inline elements as siblings within `<Box>` containers
- **AST-based**: Uses `marked.lexer()` for clean token parsing instead of HTML parsing

### Dependencies

- `marked` (v18+) - Markdown parser that generates AST
- `ink` (v6.8+) - Terminal UI framework
- `react` (v19+) - UI library
