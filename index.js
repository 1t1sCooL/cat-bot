const { Telegraf, Markup } = require("telegraf");
const cron = require("node-cron");

const token = process.env.CAT_BOT_TOKEN;
const bot = new Telegraf(token);

const userSettings = {};
const getCatUrl = () => `https://cataas.com/cat?t=${new Date().getTime()}`;

const getKeyboard = (chatId) => {
  const isSubscribed = userSettings[chatId]?.daily;
  const buttons = [];

  if (isSubscribed) {
    buttons.push(["Отписаться 🔕"]);
  } else {
    buttons.push(["Подписаться 🔔"]);
  }

  buttons.push(["Прислать котика сейчас 🐾"]);

  return Markup.keyboard(buttons).resize();
};

const removeMenu = Markup.removeKeyboard();

const subscribeUser = (ctx) => {
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  userSettings[ctx.chat.id] = { daily: true };

  if (isGroup) {
    return ctx.reply("Вы подписались!", removeMenu);
  }
  ctx.reply("Вы подписались на ежедневных котов!", getKeyboard(ctx.chat.id));
};

const unsubscribeUser = (ctx) => {
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  if (userSettings[ctx.chat.id]) userSettings[ctx.chat.id].daily = false;

  if (isGroup) {
    return ctx.reply("Рассылка отключена.", removeMenu);
  }
  ctx.reply("Рассылка отключена.", getKeyboard(ctx.chat.id));
};

bot.start((ctx) => {
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  if (isGroup) {
    return ctx.reply(
      "Привет! В группах я присылаю котов рандомно.",
      removeMenu
    );
  }
  ctx.reply("Привет! Я кото-бот.", getKeyboard(ctx.chat.id));
});

bot.command("subscribe", subscribeUser);
bot.hears("Подписаться 🔔", subscribeUser);
bot.command("unsubscribe", unsubscribeUser);
bot.hears("Отписаться 🔕", unsubscribeUser);

bot.hears("Прислать котика сейчас 🐾", (ctx) => {
  return ctx.replyWithPhoto(getCatUrl());
});

bot.on("message", async (ctx) => {
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";

  if (isGroup) {
    const chance = Math.random();
    if (chance < 0.1) {
      try {
        await ctx.replyWithPhoto(getCatUrl());
      } catch (e) {
        console.error(e);
      }
    }
  }
});

cron.schedule(
  "0 30 15 * * *",
  () => {
    for (const chatId in userSettings) {
      if (userSettings[chatId].daily) {
        bot.telegram.sendPhoto(chatId, getCatUrl()).catch(console.error);
      }
    }
  },
  { timezone: "Europe/Moscow" }
);

bot.launch().then(() => console.log("Бот запущен с динамической клавиатурой"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
