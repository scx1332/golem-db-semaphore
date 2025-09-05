//Bun automatically loads .env files, no need for dotenv package
//import dotenv from "dotenv";
//https://bun.sh/guides/runtime/set-env

//Hono is a web framework similar to Express
import jsLogger, { ILogger } from "js-logger";
import { getBytes, Wallet } from "ethers";
import { AccountData, createClient, Tagged } from "golem-base-sdk";
import { appState, startStatusServer } from "./server";
import { v4 as uuidv4 } from "uuid";

// Configure logger for convenience
jsLogger.useDefaults();
jsLogger.setLevel(jsLogger.DEBUG);
jsLogger.setHandler(
  jsLogger.createDefaultHandler({
    formatter: function (messages, context) {
      // prefix each log message with a timestamp.
      messages.unshift(`[${new Date().toISOString()} ${context.level.name}]`);
    },
  }),
);

export const log: ILogger = jsLogger.get("myLogger");

async function spawnTask() {
  log.info("Task spawned, doing nothing and exiting...");
  const taskId = uuidv4();
  try {
    appState.numberOfTasks += 1;
    appState.tasks.push(taskId);

    await new Promise((resolve) => setTimeout(resolve, 10000));
  } catch (e) {
    log.error("Task failed with error:", e);
  } finally {
    log.info("Task finished.");
    appState.numberOfTasks -= 1;
    appState.tasks = appState.tasks.filter((t) => t !== taskId);
  }
}

async function init() {
  log.info("Connecting to Golem DB client...");

  const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY || "");
  log.info("Successfully decrypted wallet for account", wallet.address);

  const key: AccountData = new Tagged(
    "privatekey",
    getBytes(wallet.privateKey),
  );

  const client = await createClient(
    60138453033,
    key,
    "https://ethwarsaw.holesky.golemdb.io/rpc",
    "wss://ethwarsaw.holesky.golemdb.io/rpc/ws",
  );

  const port = process.env.PORT || 5555;
  log.info(`Starting server at http://localhost:${port}`);
  startStatusServer(`http://localhost:${port}`);

  while (true) {
    const block = await client.getRawClient().httpClient.getBlockNumber();
    log.info("Current Ethereum block number is", block);
    log.info("Connected to Golem DB as", wallet.address);

    await new Promise((resolve) => setTimeout(resolve, 500));

    await spawnTask();
  }

  // Fill your initialization code here
}

init()
  .then(() => {})
  .catch((e) => {
    log.error(e);
    process.exit(1);
  });
