/*** includes ***/

import { exit, stdin, stdout } from "node:process";
import fs from "node:fs";
/****************/

/*** defines ***/

const ERASE_IN_DISPLAY = "\x1b[2J";
const ERASE_IN_LINE = "\x1b[2K";
const ERASE_IN_LINE_RIGHT = "\x1b[K";
const CURSOR_HOME = "\x1b[H";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const KILO_VERSION = "0.0.1";
/***************/

/*** data ***/

const E = {
  screenRows: 0,
  screenCols: 0,
  cx: 0,
  cy: 0,
};
/************/

/*** terminal ***/

function getWindowSize() {
  const windowSize = stdout.getWindowSize();
  E.screenCols = windowSize[0];
  E.screenRows = windowSize[1];
}

function cleanup() {
  const buffer = appendBuffer(ERASE_IN_LINE, CURSOR_HOME, SHOW_CURSOR);
  stdout.write(buffer);
  if (stdin.isTTY) stdin.setRawMode(false);
}

process.on("exit", () => {
  if (stdin.isTTY && stdin.isRaw) stdin.setRawMode(false);
});

process.on("uncaughtException", (error) => {
  fs.writeSync(process.stderr.fd, `Fatal error: ${error.stack || String(error)}\n`);
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
  for (let i = 0; i < E.screenRows; i++) {
    if (i === Math.floor(E.screenRows / 3)) {
      let welcome = `JavaScript Kilo editor -- version ${KILO_VERSION}`;
      if (welcome.length > E.screenCols) {
        welcome = welcome.substring(0, E.screenCols);
      }
      let padding = Math.floor((E.screenCols - welcome.length) / 2);
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
    if (i < E.screenRows - 1) {
      tildes.push("\r\n");
    }
  }
  stdout.write(tildes.join(""));
}

function editorRefreshScreen() {
  let buffer = appendBuffer(HIDE_CURSOR, CURSOR_HOME);
  stdout.write(buffer);

  editorDrawRows();

  const moveCursor = `\x1b[${E.cy + 1};${E.cx + 1}H`;

  buffer = appendBuffer(moveCursor, SHOW_CURSOR);
  stdout.write(buffer);
}
/**************/

/*** input ***/

const processSingleKeypress = {
  17: () => {
    exit(0); // ctrl+q
  },
  97: () => {
    if (E.cx > 0) E.cx--; // a
  },
  100: () => {
    if (E.cx < E.screenCols - 1) E.cx++; // d
  },
  119: () => {
    if (E.cy > 0) E.cy--; // w
  },
  115: () => {
    if (E.cy < E.screenRows - 1) E.cy++; // s
  },
};

function processControlKeypress(buffer) {
  if (buffer.equals(Buffer.from("\x1b[A"))) {
    processSingleKeypress[119]();
  }
}

function editorProcessKeypress(buffer) {
  if (buffer.length === 1) {
    (processSingleKeypress[buffer[0]] || (() => {}))();
  } else {
    processControlKeypress(buffer);
  }
}
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
    editorProcessKeypress(data);
    editorRefreshScreen();
  });

  initEditor();
  editorRefreshScreen();
  stdin.setRawMode(true);
}
/************/

main();
