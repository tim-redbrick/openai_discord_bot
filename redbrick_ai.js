require("dotenv/config");
const { OpenAI } = require("openai");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    const assistant = await openai.beta.assistants.retrieve(
      process.env.OPENAI_BOT
    );
    const thread = await openai.beta.threads.create();

    let keepAsking = true;

    while (keepAsking) {
      const userQuestion = await askQuestion("\nWhat is your question?\n");
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: userQuestion,
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      });

      let runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );

      while (runStatus.status !== "completed") {
        await new Promise((resolve) => setTimeout(resolve, 200));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      const messages = await openai.beta.threads.messages.list(thread.id);

      const lastMessageForRun = messages.data
        .filter((msg) => msg.run_id === run.id && msg.role === "assistant")
        .pop();

      if (lastMessageForRun) {
        console.log(`\n${lastMessageForRun.content[0].text.value}\n`);
      }

      const continueAsking = await askQuestion(
        "Do you want to ask another question? (yes/no)\n"
      );
      keepAsking = continueAsking.toLowerCase() === "yes";
    }
  } catch (error) {
    console.error(error);
  } finally {
    readline.close();
  }
}

main();
