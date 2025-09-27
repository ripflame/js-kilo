import { exit, stdin, stdout } from "node:process";
import fs from "node:fs";

const editorProcessKeypress = {
  17: () => {
    exit(0);
  },
};

function editorRefreshScreen() {
  stdout.write("\x1b[2J", "utf8");
  stdout.write("\x1b[H", "utf8");
}

function main() {
  if (!stdin.isTTY) {
    console.error("No piping.");
    exit(1);
  }

  stdin.on("data", (data) => {
    editorRefreshScreen();
    if (data.length === 1) {
      (editorProcessKeypress[data[0]] || (() => {}))();
    } else {
    }
  });

  stdin.setRawMode(true);
}

function cleanup() {
  stdout.write("\x1b[2K", "utf8");
  stdout.write("\x1b[H", "utf8");
  stdout.write("\x1b[?25h", "utf8");
  if (stdin.isTTY) stdin.setRawMode(false);
}

process.on("exit", () => {
  if (stdin.isTTY && stdin.isRaw) stdin.setRawMode(false);
});

process.on("uncaughtException", (error) => {
  fs.writeSync(
    process.stderr.fd,
    `Fatal error: ${error.stack || String(error)}\n`,
  );
  cleanup();
  exit(1);
});

process.on("SIGINT", () => {
  cleanup();
  exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  exit(1);
});

process.on("unhandledRejection", () => {
  cleanup();
  exit(1);
});

main();
