import { exit, stdin, stdout } from "node:process";
import { inspect } from "node:util";

function main() {
  if (!stdin.isTTY) {
    console.error("No piping.");
    exit(1);
  }

  stdin.on("data", (data) => {
    console.log([...data]);
    if (data.equals(Buffer.from([0x71]))) {
      exit(0);
    }
  });

  stdin.setRawMode(true);
}

main();
