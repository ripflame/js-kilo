/*** includes ***/
import { exit, stdin, stdout } from "node:process";
import fs from "node:fs";
import { open } from "node:fs/promises";
import { inspect } from "node:util";
/****************/

/*** defines ***/
const ERASE_IN_DISPLAY = "\x1b[2J";
const ERASE_IN_LINE = "\x1b[2K";
const ERASE_IN_LINE_RIGHT = "\x1b[K";
const CURSOR_HOME = "\x1b[H";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const KILO_VERSION = process.env.npm_package_version;
const KILO_TAB_STOP = 4;

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
const INV_COLR = "\x1b[7m";
const REV_INV_COLR = "\x1b[m";
let ONE_SHOT = true;
/***************/

/*** data ***/

const E = {
  screenRows: 0,
  screenCols: 0,
  cx: 0,
  cy: 0,
  rx: 0,
  rowOffset: 0,
  colOffset: 0,
  rows: [],
  get numRows() {
    return this.rows.length;
  },
  filename: "",
};

/************/

/*** row operations ***/
function editorRowCxToRx(row, cx) {
  let rx = 0;
  for (let character = 0; character < cx; character++) {
    if (E.rows[row].line[character] === "\t") {
      rx += KILO_TAB_STOP - 1 - (rx % KILO_TAB_STOP);
    }
    rx++;
  }

  return rx;
}

function editorUpdateRow(line) {
  let render = "";
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\t") {
      for (let j = 0; j < KILO_TAB_STOP; j++) {
        render = render + " ";
      }
    } else {
      render = render + line[i];
    }
  }

  const erow = {
    line: line,
    render: render,
  };

  return erow;
}

function editorAppendRow(line) {
  const erow = editorUpdateRow(line);
  E.rows.push(erow);
}
/**********************/

/*** file i/o ***/
async function editorOpen(filename) {
  try {
    const file = await open(filename);
    for await (const line of file.readLines()) {
      editorAppendRow(line);
    }
    E.filename = filename;
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
  E.screenRows -= 1;
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
      currentLine.push(E.rows[fileRow].render.slice(E.colOffset, E.screenCols + E.colOffset));
    }

    currentLine.push(ERASE_IN_LINE_RIGHT);
    currentLine.push("\r\n");
  }

  stdout.write(currentLine.join(""));
}

function editorRefreshScreen() {
  getWindowSize();
  editorScroll();
  let buffer = appendBuffer(HIDE_CURSOR, CURSOR_HOME);
  stdout.write(buffer);

  editorDrawRows();
  editorDrawStatusBar();

  const moveCursor = `\x1b[${E.cy - E.rowOffset + 1};${E.rx - E.colOffset + 1}H`;

  buffer = appendBuffer(moveCursor, SHOW_CURSOR);
  stdout.write(buffer);
}

function editorScroll() {
  E.rx = 0;
  if (E.cy < E.numRows) {
    E.rx = editorRowCxToRx(E.cy, E.cx);
  }

  if (E.cy < E.rowOffset) {
    E.rowOffset = E.cy;
  }
  if (E.cy >= E.rowOffset + E.screenRows) {
    E.rowOffset = E.cy - E.screenRows + 1;
  }
  if (E.rx < E.colOffset) {
    E.colOffset = E.rx;
  }
  if (E.rx >= E.colOffset + E.screenCols) {
    E.colOffset = E.rx - E.screenCols + 1;
  }
}

function editorDrawStatusBar() {
  let buffer = INV_COLR;

  const linesString = ` ${E.numRows < 0 ? "0" : E.numRows} lines`;
  let filename = E.filename === "" ? "[No Name]" : E.filename;
  if (E.filename.length > 20) {
    filename = E.filename.slice(0, 21);
  }
  if (filename.length > E.screenCols) {
    filename = filename.slice(0, E.screenCols + 1);
  }
  while (filename.length < E.screenCols - linesString.length) {
    filename += " ";
  }
  filename += linesString;
  if (filename.length > E.screenCols) {
    filename = filename.slice(0, E.screenCols);
  }
  buffer += filename;
  buffer += REV_INV_COLR;
  stdout.write(buffer);
}

/**************/

/*** input ***/

const snapCursor = () => {
  E.cx = Math.min(E.cx, E.rows[E.cy]?.line.length ?? 0);
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
    if (E.cx != 0) {
      E.cx--;
    } else if (E.cy > 0) {
      E.cy--;
      E.cx = E.rows[E.cy].line.length;
    }
    snapCursor();
  },
  s: () => {
    if (E.cy < E.numRows) E.cy++;
    snapCursor();
  },
  d: () => {
    if (E.cx < E.rows[E.cy]?.line.length ?? 0) {
      E.cx++;
    } else if (E.cx === E.rows[E.cy]?.line.length ?? 0) {
      E.cy++;
      E.cx = 0;
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
      if (E.cy < E.numRows) E.cy++;
    }
  },
  [HOME_KEY]: () => {
    E.cx = 0;
  },
  [END_KEY]: () => {
    if (E.cy < E.numRows) {
      E.cx = E.rows[E.cy].line.length;
    }
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

  stdout.on("resize", () => {
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
