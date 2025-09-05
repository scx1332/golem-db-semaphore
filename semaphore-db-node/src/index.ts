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

let taskNo = -1;

async function spawnTask() {
  log.info("Task spawned, doing nothing and exiting...");
  const taskId = uuidv4();
  {
    log.info(
      "Checking for semaphore access...",
    );

    for (const myTask of appState.tasks) {
      if (myTask.taskId !== taskId) continue;
      myTask.progress = 0;
      myTask.message = `Task is waiting for semaphore access`;
      myTask.status = "waiting";
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (appState.tasks.length >= 5) {
      log.info("Task not started.");
      return;
    }
  }

  try {
    {
      //add task
      //should be atomic
      taskNo += 1;
      appState.numberOfTasks += 1;
      appState.tasks.push({
        taskId,
        description: `Task no ${taskNo}`,
        status: "running",
        message: "Task is running",
        progress: 0,
        startTime: new Date().toISOString(),
      });
    }
    for (let i = 0; i < 10; i++) {

      for (const myTask of appState.tasks) {
        if (myTask.taskId !== taskId) continue;
        myTask.progress = (i + 1) * 10;
        myTask.message = `Task is running: ${myTask.progress}% done`;
      }


      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
  } catch (e) {
    log.error("Task failed with error:", e);
  } finally {
    log.info(`Task ${taskId} finished.`);
    appState.numberOfTasks -= 1;
    appState.tasks = appState.tasks.filter((t) => t.taskId !== taskId);
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
