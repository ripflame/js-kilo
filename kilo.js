/*** includes ***/
import { exit, stdin, stdout } from "node:process";
import fs from "node:fs";
/****************/

/*** defines ***/
const ERASE_IN_DISPLAY = "\x1b[2J";
const ERASE_IN_LINE = "\x1b[2K";
const ERASE_IN_LINE_RIGHT = "\x1b[K";
const CURSOR_POSITION = "\x1b[H";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const KILO_VERSION = "0.0.1";
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
  const buffer = appendBuffer(ERASE_IN_LINE, CURSOR_POSITION, SHOW_CURSOR);
  stdout.write(buffer);
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

/*** append buffer ***/
function appendBuffer(...elements) {
  return elements.join("");
}
/*********************/
/*** output ***/

function editorDrawRows() {
  const tildes = [];
  for (let i = 0; i < editorConfig.screenRows; i++) {
    if (i === Math.floor(editorConfig.screenRows / 3)) {
      let welcome = `Kilo editor -- version ${KILO_VERSION}`;
      if (welcome.length > editorConfig.screenCols) {
        welcome = welcome.substring(0, editorConfig.screenCols);
      }
      let padding = Math.floor((editorConfig.screenCols - welcome.length) / 2);
      if (padding) {
        tildes.push("~");
        padding--;
      }
      while (padding--) {
        tildes.push(" ");
      }
      tildes.push(welcome);
    } else {
      tildes.push("~");
    }
    tildes.push(ERASE_IN_LINE_RIGHT);
    if (i < editorConfig.screenRows - 1) {
      tildes.push("\r\n");
    }
  }
  stdout.write(tildes.join(""));
}

function editorRefreshScreen() {
  let buffer = appendBuffer(HIDE_CURSOR, CURSOR_POSITION);
  stdout.write(buffer);
  editorDrawRows();
  buffer = appendBuffer(CURSOR_POSITION, SHOW_CURSOR);
  stdout.write(buffer);
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
