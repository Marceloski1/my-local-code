export async function* parseSSE<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      if (part.startsWith('data: ')) {
        const dataStr = part.substring(6);
        try {
          yield JSON.parse(dataStr) as T;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('SDK: Error parsing SSE JSON', e, dataStr);
        }
      }
    }
  }
}
