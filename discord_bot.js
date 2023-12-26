require(`dotenv/config`);
const { Client } = require(`discord.js`);
const { OpenAI } = require(`openai`);

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

client.on("ready", () => {
  console.log("the bot is online");
});

const IGNORE_PREFIX = "!";
const CHANNELS = ["987960318925873245", "1189031880180371566"];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith(IGNORE_PREFIX)) return;
  if (
    !CHANNELS.includes(message.channelId) &&
    !message.mentions.users.has(client.user.id)
  )
    return;

  await message.channel.sendTyping();

  const sendTypingInterval = setInterval(() => {
    message.channel.sendTyping();
  }, 5000);

  let prevMessages = await message.channel.messages.fetch({ limit: 10 });
  prevMessages.reverse();

  const assistant = await openai.beta.assistants.retrieve(
    process.env.OPENAI_BOT
  );
  const thread = await openai.beta.threads.create();

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: message.content,
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });

  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

  while (runStatus.status !== "completed") {
    await new Promise((resolve) => setTimeout(resolve, 200));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }
  clearInterval(sendTypingInterval);

  const messages = await openai.beta.threads.messages.list(thread.id);

  const lastMessageForRun = messages.data
    .filter((msg) => msg.run_id === run.id && msg.role === "assistant")
    .pop();

  // if (lastMessageForRun) {
  //   console.log(`\n${lastMessageForRun.content[0].text.value}\n`);
  // }

  // const response = await openai.chat.completions
  //   .create({
  //     model: "gpt-4",
  //     //   response_format: { type: "json_object" },
  //     messages: conversation,
  //   })
  //   .catch((error) => console.error("OpenAI Error:\n", error));
  // if (!response) {
  //   message.reply(
  //     "I'm having some trouble with the OprenAI API. Try again in a moment."
  //   );
  //   return;
  // }

  const responseMessage = lastMessageForRun.content[0].text.value;
  const chunkSizeLimit = 2000;

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
    const chunk = responseMessage.substring(i, i + chunkSizeLimit);

    await message.reply(chunk);
  }
});

client.login(process.env.TOKEN);
