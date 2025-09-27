import { exit, stdin, stdout } from "node:process";
import { inspect } from "node:util";

const editorProcessKeypress = {
  17: () => {
    exit(0);
  },
};

function main() {
  if (!stdin.isTTY) {
    console.error("No piping.");
    exit(1);
  }

  stdin.on("data", (data) => {
    if (data.length === 1) {
      (editorProcessKeypress[data[0]] || (() => {}))();
    } else {
    }
  });

  stdin.setRawMode(true);
}

main();
