//Bun automatically loads .env files, no need for dotenv package
//import dotenv from "dotenv";
//https://bun.sh/guides/runtime/set-env

//Hono is a web framework similar to Express
import { Hono } from "hono";
import jsLogger, { ILogger } from "js-logger";
import {getBytes, Wallet} from "ethers";
import {AccountData, createClient, Tagged} from "golem-base-sdk";
import {startStatusServer} from "./server";

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

// Create web server using Hono
const app = new Hono();

async function init() {
  log.info("Connecting to Golem DB client...");

  const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY || "");
  log.info("Successfully decrypted wallet for account", wallet.address);

  const key: AccountData = new Tagged("privatekey", getBytes(wallet.privateKey));

  const client = await createClient(
    60138453033,
    key,
    "https://ethwarsaw.holesky.golemdb.io/rpc",
    "wss://ethwarsaw.holesky.golemdb.io/rpc/ws"
  );

  const port = process.env.PORT || 5555;
  log.info(`Starting server at http://localhost:${port}`);
  startStatusServer(`http://localhost:${port}`);

  const block = await client.getRawClient().httpClient.getBlockNumber();

  while (true) {
    log.info("Current Ethereum block number is", block);
    log.info("Connected to Golem DB as", wallet.address);

    await new Promise(resolve => setTimeout(resolve, 1000));

  }

  // Fill your initialization code here
}

init()
  .then(() => {

  })
  .catch((e) => {
    log.error(e);
    process.exit(1);
  });
