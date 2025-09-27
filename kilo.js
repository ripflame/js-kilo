/*** includes ***/
import { exit, stdin, stdout } from "node:process";
import fs from "node:fs";
/****************/

/*** defines ***/
/***************/

/*** data ***/
const editorConfig = {
  screenRows: 0,
  screenCols: 0,
};
/************/

/*** terminal ***/
function getWindowSize() {
  const windowSize = stdout.getWindowSize();
  editorConfig.screenCols = windowSize[0];
  editorConfig.screenRows = windowSize[1];
}

function cleanup() {
  stdout.write("\x1b[2K");
  stdout.write("\x1b[H");
  stdout.write("\x1b[?25h");
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
/****************/

/*** output ***/
function editorDrawRows() {
  const tildes = [];
  for (let i = 0; i < editorConfig.screenRows; i++) {
    tildes.push("~");
    if (i < editorConfig.screenRows - 1) {
      tildes.push("\r\n");
    }
  }
  stdout.write(tildes.join(""));
}

function editorRefreshScreen() {
  stdout.write("\x1b[2J");
  stdout.write("\x1b[H");
  editorDrawRows();
  stdout.write("\x1b[H");
}
/**************/

/*** input ***/
const editorProcessKeypress = {
  17: () => {
    exit(0);
  },
};
/*************/

/*** init ***/
function initEditor() {
  getWindowSize();
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

  initEditor();
  editorRefreshScreen();
  stdin.setRawMode(true);
}
/************/

main();
