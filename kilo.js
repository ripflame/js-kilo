/*** includes ***/
import { exit, stdin, stdout } from "node:process";
import fs from "node:fs";
import { open } from "node:fs/promises";
/****************/

/*** defines ***/
const ERASE_IN_DISPLAY = "\x1b[2J";
const ERASE_IN_LINE = "\x1b[2K";
const ERASE_IN_LINE_RIGHT = "\x1b[K";
const CURSOR_HOME = "\x1b[H";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const KILO_VERSION = process.env.npm_package_version;

const CTRL_Q = "\x11";
const ARROW_UP = "\x1b[A";
const ARROW_DOWN = "\x1b[B";
const ARROW_RIGHT = "\x1b[C";
const ARROW_LEFT = "\x1b[D";
const PAGE_UP = "\x1b[5~";
const PAGE_DOWN = "\x1b[6~";
const HOME_KEY = "\x1b[1~";
const END_KEY = "\x1b[4~";
const DEL_KEY = "\x1b[3~";
/***************/

/*** data ***/

const E = {
  screenRows: 0,
  screenCols: 0,
  cx: 0,
  cy: 0,
  rowOffset: 0,
  colOffset: 0,
  rows: [],
  get numRows() {
    return this.rows.length;
  },
};

/************/

/*** row operations ***/
function editorAppendRow(line) {
  E.rows.push(line);
}
/**********************/

/*** file i/o ***/
async function editorOpen(filename) {
  try {
    const file = await open(filename);
    for await (const line of file.readLines()) {
      editorAppendRow(line);
    }
  } catch (err) {
    console.error(`Error: Reading file >> ${err.message}`);
    exit(1);
  }
}
/****************/

/*** terminal ***/

function getWindowSize() {
  const windowSize = stdout.getWindowSize();
  E.screenCols = windowSize[0];
  E.screenRows = windowSize[1];
}

function cleanup() {
  const buffer = appendBuffer(SHOW_CURSOR);
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
  const currentLine = [];
  for (let i = 0; i < E.screenRows; i++) {
    let fileRow = i + E.rowOffset;
    if (fileRow >= E.numRows) {
      if (E.numRows === 0 && i === Math.floor(E.screenRows / 3)) {
        let welcome = `JavaScript Kilo editor -- version ${KILO_VERSION}`;
        if (welcome.length > E.screenCols) {
          welcome = welcome.substring(0, E.screenCols);
        }
        let padding = Math.floor((E.screenCols - welcome.length) / 2);
        if (padding) {
          currentLine.push("~");
          padding--;
        }
        while (padding--) {
          currentLine.push(" ");
        }
        currentLine.push(welcome);
      } else {
        currentLine.push("~");
      }
    } else {
      currentLine.push(E.rows[fileRow].slice(0 + E.colOffset, E.screenCols + E.colOffset));
    }

    currentLine.push(ERASE_IN_LINE_RIGHT);
    if (i < E.screenRows - 1) {
      currentLine.push("\r\n");
    }
  }

  stdout.write(currentLine.join(""));
}

function editorRefreshScreen() {
  editorScroll();
  let buffer = appendBuffer(HIDE_CURSOR, CURSOR_HOME);
  stdout.write(buffer);

  editorDrawRows();

  const moveCursor = `\x1b[${E.cy - E.rowOffset + 1};${E.cx - E.colOffset + 1}H`;

  buffer = appendBuffer(moveCursor, SHOW_CURSOR);
  stdout.write(buffer);
}

function editorScroll() {
  if (E.cy < E.rowOffset) {
    E.rowOffset = E.cy;
  }
  if (E.cy >= E.rowOffset + E.screenRows) {
    E.rowOffset = E.cy - E.screenRows + 1;
  }
  if (E.cx < E.colOffset) {
    E.colOffset = E.cx;
  }
  if (E.cx >= E.colOffset + E.screenCols) {
    E.colOffset = E.cx - E.screenCols + 1;
  }
}

/**************/

/*** input ***/

const snapCursor = () => {
  E.cx = Math.min(E.cx, E.rows[E.cy]?.length ?? 0);
  E.cx = Math.max(E.cx, 0);
  E.cy = Math.min(E.cy, E.numRows);
  E.cy = Math.max(E.cy, 0);
};

const editorProcessKeypress = {
  [CTRL_Q]: () => {
    exit(0); // ctrl+q
  },
  w: () => {
    if (E.cy > 0) E.cy--;
    snapCursor();
  },
  a: () => {
    if (E.cx > 0) E.cx--;
    snapCursor();
  },
  s: () => {
    if (E.cy < E.numRows) E.cy++;
    snapCursor();
  },
  d: () => {
    if (E.cx < E.rows[E.cy]?.length ?? 0) {
      E.cx++;
    }
    snapCursor();
  },
  [ARROW_UP]: () => {
    editorProcessKeypress.w();
  },
  [ARROW_LEFT]: () => {
    editorProcessKeypress.a();
  },
  [ARROW_DOWN]: () => {
    editorProcessKeypress.s();
  },
  [ARROW_RIGHT]: () => {
    editorProcessKeypress.d();
  },
  [PAGE_UP]: () => {
    let times = E.screenRows;
    while (times--) {
      if (E.cy > 0) E.cy--;
    }
  },
  [PAGE_DOWN]: () => {
    let times = E.screenRows;
    while (times--) {
      if (E.cy < E.screenRows - 1) E.cy++;
    }
  },
  [HOME_KEY]: () => {
    E.cx = 0;
  },
  [END_KEY]: () => {
    E.cx = E.screenCols - 1;
  },
  [DEL_KEY]: () => {},
};

/*************/

/*** init ***/

function initEditor() {
  getWindowSize();
}

async function main() {
  if (!stdin.isTTY) {
    console.error("No piping.");
    exit(1);
  }

  stdin.on("data", (data) => {
    const key = data.toString();
    (editorProcessKeypress[key] || (() => {}))();
    editorRefreshScreen();
  });

  initEditor();

  if (process.argv.length > 2) {
    await editorOpen(process.argv[2]);
  }

  editorRefreshScreen();
  stdin.setRawMode(true);
}
/************/

main();
