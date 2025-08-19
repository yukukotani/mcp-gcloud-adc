import type { LevelWithSilent, Logger as PinoLogger } from "pino";
import pino from "pino";
import pretty from "pino-pretty";

type LogType = "stderr" | "file";

type LoggerConfig = {
  level?: pino.LevelWithSilent;
  type?: LogType;
  filePath?: string;
};

export function createLogger(config: LoggerConfig = {}): PinoLogger {
  const {
    level = "silent",
    type = "file",
    filePath = "./mcp-gcloud-adc.log",
  } = config;

  if (level === "silent") {
    return pino({ level }); // stub
  }

  const destination =
    type === "stderr" ? pino.destination(2) : pino.destination(filePath);

  const stream = pretty({
    ignore: "pid,hostname",
    destination,
  });

  return pino(
    {
      level,
    },
    stream,
  );
}

export const logger = createLogger({
  type: (process.env.LOG_TYPE as LogType) || "file",
  level: (process.env.LOG_LEVEL as LevelWithSilent) || "silent",
  filePath: process.env.LOG_FILE_PATH || "./mcp-gcloud-adc.log",
});
