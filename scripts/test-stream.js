
const { streamText } = require('ai');
const { MockLanguageModelV1 } = require('ai/test');

async function testStream() {
  const model = new MockLanguageModelV1({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
          controller.close();
        },
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  });

  const result = streamText({
    model,
    messages: [{ role: 'user', content: 'hi' }],
  });

  console.log('Keys on result object:', Object.keys(result));
  console.log('toDataStreamResponse exists?', typeof result.toDataStreamResponse === 'function');
  console.log('toTextStreamResponse exists?', typeof result.toTextStreamResponse === 'function');
}

testStream().catch(console.error);
