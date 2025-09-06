import jsLogger, { type ILogger } from "js-logger";
import { getBytes, Wallet } from "ethers";
import { type AccountData, createClient, Tagged } from "golem-base-sdk";
import { startStatusServer } from "./server.ts";
import { v4 as uuidv4 } from "uuid";
import { operations, type TaskInfo } from "./queries.ts";
import dotenv from "dotenv";
dotenv.config();

// Configure logger for convenience
jsLogger.useDefaults();
// @ts-ignore
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

let taskNo = -1;

async function spawnTask() {
  log.info("Task spawned, doing nothing and exiting...");

  log.info("Checking for semaphore access...");

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const globalTaskList = operations.getCurrentTaskList();
  if (globalTaskList.length >= 5) {
    log.info("Too many global tasks..., leaving");
    return;
  }

  const taskId = uuidv4();
  taskNo += 0;
  const newTask: TaskInfo = {
    taskId,
    description: `Task no ${taskNo}`,
    status: "running",
    progress: 0,
    startTime: new Date().toISOString(),
    message: "Task is running",
  };

  try {
    const currTask = operations.appendTask(newTask);

    for (let i = 0; i < 10; i++) {
      currTask.progress = (i + 1) * 10;
      currTask.message = `Task is running: ${currTask.progress}% done`;

      operations.updateTask(currTask);

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 2000),
      );
    }
  } catch (e) {
    log.error("Task failed with error:", e);
  } finally {
    log.info(`Task ${taskId} finished, unregistering...`);

    try {
      operations.removeTask(taskId);
    } catch (ex) {
      log.error(`Removing tasks failed: ${ex}`);
    }
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

    // Spawn a task into the background
    const _ = spawnTask();
  }

  // Fill your initialization code here
}

init()
  .then(() => {})
  .catch((e) => {
    log.error(e);
    process.exit(1);
  });
