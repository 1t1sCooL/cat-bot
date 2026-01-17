const { Telegraf, Markup } = require("telegraf");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const token = process.env.CAT_BOT_TOKEN;
if (!token) {
  console.error("CAT_BOT_TOKEN is not set");
  process.exit(1);
}
const bot = new Telegraf(token);

const settingsFilePath = process.env.CAT_BOT_SETTINGS_PATH
  ? path.resolve(process.env.CAT_BOT_SETTINGS_PATH)
  : path.join(__dirname, "userSettings.json");

const timezone = process.env.CAT_BOT_TIMEZONE || "Europe/Moscow";
const dailyCron = process.env.CAT_BOT_DAILY_CRON || "0 30 15 * * *";
const groupCatChanceRaw = process.env.CAT_BOT_GROUP_CAT_CHANCE;
const groupCatChance = (() => {
  if (groupCatChanceRaw === undefined) return 0.1;
  const n = Number(groupCatChanceRaw);
  if (!Number.isFinite(n)) return 0.1;
  return Math.min(1, Math.max(0, n));
})();

let userSettings = {};

const loadUserSettings = () => {
  try {
    if (!fs.existsSync(settingsFilePath)) return;
    const raw = fs.readFileSync(settingsFilePath, "utf8");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") userSettings = parsed;
  } catch (e) {
    console.error("Failed to load user settings", e);
  }
};

const saveUserSettings = () => {
  try {
    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${settingsFilePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(userSettings, null, 2), "utf8");
    fs.renameSync(tmpPath, settingsFilePath);
  } catch (e) {
    console.error("Failed to save user settings", e);
  }
};

loadUserSettings();
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
  if (!ctx.chat) return;
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  userSettings[ctx.chat.id] = { daily: true };
  saveUserSettings();

  if (isGroup) {
    return ctx.reply("Вы подписались!", removeMenu);
  }
  ctx.reply("Вы подписались на ежедневных котов!", getKeyboard(ctx.chat.id));
};

const unsubscribeUser = (ctx) => {
  if (!ctx.chat) return;
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  if (userSettings[ctx.chat.id]) userSettings[ctx.chat.id].daily = false;
  saveUserSettings();

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

bot.command("cat", (ctx) => {
  return ctx.replyWithPhoto(getCatUrl());
});
bot.hears("Прислать котика сейчас 🐾", (ctx) => {
  return ctx.replyWithPhoto(getCatUrl());
});

bot.command("help", (ctx) => {
  ctx.reply(`Привет! Я кото-бот.
  Мои команды:
  /subscribe - подписаться на рассылку (каждый день в 15:30 по мск)
  /unsubscribe - отписаться
  /status - статус рассылки в этом чате
  /cat - прислать кота`);
});

bot.command("status", (ctx) => {
  if (!ctx.chat) return;
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  const enabled = Boolean(userSettings[ctx.chat.id]?.daily);
  const statusText = enabled ? "включена" : "выключена";

  if (isGroup) {
    return ctx.reply(`Рассылка ${statusText}.`, removeMenu);
  }

  return ctx.reply(`Рассылка ${statusText}.`, getKeyboard(ctx.chat.id));
});

bot.on("message", async (ctx) => {
  if (!ctx.chat) return;
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";

  if (isGroup) {
    const chance = Math.random();
    if (chance < groupCatChance) {
      try {
        await ctx.replyWithPhoto(getCatUrl());
      } catch (e) {
        console.error(e);
      }
    }
  }
});

cron.schedule(
  dailyCron,
  () => {
    for (const chatId in userSettings) {
      if (userSettings[chatId] && userSettings[chatId].daily) {
        bot.telegram
          .sendPhoto(chatId, getCatUrl())
          .catch((e) => console.error("Failed to send scheduled cat", e));
      }
    }
  },
  { timezone }
);

bot.launch().then(() => console.log("Бот запущен с динамической клавиатурой"));

bot.catch((err, ctx) => {
  console.error("Telegraf error", { err, update: ctx && ctx.update });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception", err);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
