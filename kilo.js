import { exit, stdin, stdout } from "node:process";

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

main();
