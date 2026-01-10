const { Telegraf, Markup } = require("telegraf");
const cron = require("node-cron");

const bot = new Telegraf("8582077123:AAH4VsMAePaz3B1GkN7vknxECq_8Tup_TVQ");

const userSettings = {};
const getCatUrl = () => `https://cataas.com/cat?t=${new Date().getTime()}`;

const mainMenu = Markup.keyboard([
  ["Подписаться 🔔", "Отписаться 🔕"],
  ["Прислать котика сейчас 🐾"],
]).resize();

const subscribeUser = (ctx) => {
  userSettings[ctx.chat.id] = { daily: true };
  ctx.reply("Вы подписались на ежедневных котов!", mainMenu);
};

const unsubscribeUser = (ctx) => {
  if (userSettings[ctx.chat.id]) userSettings[ctx.chat.id].daily = false;
  ctx.reply("Рассылка отключена.", mainMenu);
};

bot.start((ctx) => ctx.reply("Привет! Я кото-бот.", mainMenu));
bot.command("subscribe", subscribeUser);
bot.hears("Подписаться 🔔", subscribeUser);
bot.command("unsubscribe", unsubscribeUser);
bot.hears("Отписаться 🔕", unsubscribeUser);

bot.on("message", async (ctx) => {
  const text = ctx.message.text;
  const chatId = ctx.chat.id;
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";

  if (text === "Подписаться 🔔" || text === "Отписаться 🔕") return;

  if (text === "Прислать котика сейчас 🐾") {
    return ctx.replyWithPhoto(getCatUrl());
  }

  if (isGroup) {
    const chance = Math.random();
    if (chance > 0.1) {
      console.log(`Рандом не сработал (${chance.toFixed(2)})`);
      return;
    }
  }

  try {
    await ctx.replyWithPhoto(getCatUrl());
  } catch (error) {
    console.error("Ошибка:", error);
  }
});

cron.schedule(
  "0 30 15 * * *",
  () => {
    for (const chatId in userSettings) {
      if (userSettings[chatId].daily) {
        bot.telegram
          .sendPhoto(chatId, getCatUrl())
          .catch((err) => console.error(err));
      }
    }
  },
  { timezone: "Europe/Moscow" }
);

bot
  .launch()
  .then(() => console.log("Бот запущен с вероятностью 10% в группах"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
