/**
 * Minimal SSE reader over a fetch Response body stream.
 * Yields raw `data:` payload strings.
 * @param {ReadableStream<Uint8Array>} stream
 */
export async function* parseSse(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let index = buffer.indexOf('\n')
      while (index !== -1) {
        const line = buffer.slice(0, index).replace(/\r$/, '')
        buffer = buffer.slice(index + 1)
        index = buffer.indexOf('\n')

        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload) yield payload
      }
    }

    const tail = buffer.trim()
    if (tail.startsWith('data:')) {
      const payload = tail.slice(5).trim()
      if (payload) yield payload
    }
  } finally {
    reader.releaseLock()
  }
}
