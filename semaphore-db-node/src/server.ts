import http from "http";
import url from "url";

import { log } from "./index";

interface TaskInfo {
  taskId: string;
  description: string;
  status: "waiting" | "running";
  progress: number; // percentage from 0 to 100
  startTime: string; // ISO string
  message: string; // additional info about the task
}

interface ApplicationState {
  numberOfTasks: number;
  tasks: TaskInfo[];
}

export const appState: ApplicationState = {
  numberOfTasks: 0,
  tasks: [],
};

export function startStatusServer(listenAddr: string) {
  const addr = listenAddr.replace("http://", "").replace("https://", "");
  const host = addr.split(":")[0];
  const port = parseInt(addr.split(":")[1], 10);

  const server = http.createServer((req, res) => {
    void (async () => {
      const parsedUrl = url.parse(req.url || "", true);
      const pathname = parsedUrl.pathname || "";

      const sendJSON = (status: number, data: object) => {
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        });

        res.end(JSON.stringify(data, null, 2));
      };

      const parseBody = async (): Promise<object> => {
        return new Promise((resolve, reject) => {
          let body = "";
          req.on("data", (chunk: string) => (body += chunk));
          req.on("end", () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (err) {
              if (err instanceof Error) {
                reject(err);
              } else {
                reject(new Error(`Invalid json: ${String(err)}`));
              }
            }
          });
        });
      };

      try {
        //handle preflight requests <- this saves a lot of headache with setting proxy
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
            "Content-Length": "0",
            "Content-Type": "text/plain charset=UTF-8",
          });
          res.end();
          return;
        }

        // === Routes ===
        if (req.method === "GET" && pathname === "/") {
          return sendJSON(200, {
            message: "Semaphore DB Node is running",
            timestamp: new Date().toISOString(),
          });
        }

        // === Tasks ===
        if (req.method === "GET" && pathname === "/state") {
          return sendJSON(200, {
            appState,
            timestamp: new Date().toISOString(),
          });
        }
        // Default 404
        sendJSON(404, { error: "Not Found" });
      } catch (err) {
        sendJSON(500, { error: `Internal Server Error ${err}` });
      }
    })().catch((err) => {
      log.error("Unhandled error in request handler:", err);
    });
  });

  log.info("Starting native status server...");
  server.listen(port, host, () => {
    log.info(`Native status server running at ${listenAddr}/status`);
  });
  log.info("Native status server started.");
}
