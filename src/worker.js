import { pipeline } from '@xenova/transformers';

class Pipeline {
  static task = 'text2text-generation';
  static model = 'josephj6802/codereviewer';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  let reviewer = await Pipeline.getInstance((x) => {
    self.postMessage(x);
  });

  let output = await reviewer(event.data.text, {
    max_length: 512,
    num_return_sequences: 1,
    callback_function: (x) => {
      const output = reviewer.tokenizer.decode(x[0].output_token_ids, {
        skip_special_tokens: true,
      });
      self.postMessage({
        status: 'update',
        output,
      });
    },
  });

  // Send the output back to the main thread
  self.postMessage({
    status: 'complete',
    output: output.generated_text,
  });
});
