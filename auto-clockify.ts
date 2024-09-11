import { watch } from "fs";
import { $ } from "bun";

let lastInTime = Date.now();
let lastOutTime = Date.now();
let inClockify = false;
let lastDescription = '';

async function performClockifyOut() {
  if (inClockify) {
    console.log("clockify out, by interval");
    await $`clockify-cli out`.quiet();

    if (lastInTime > lastOutTime) {
      console.log("clockify in, by restart");
      await $`clockify-cli in --interactive=0 --description="${lastDescription}" --billable`.quiet();
    } else {
      inClockify = false; 
    }

    lastOutTime = Date.now();
  }
}

async function performClockifyIn(filePath: string) {
  let description = 'default';
  try {
    const changedFiles = await $`git diff --name-only HEAD~1 HEAD | xargs -n 1 basename | paste -sd, -`.text(); 
    description = changedFiles.replace(/package.json,?/g, "").trim();
  } catch (err) {
    console.info('warning: git diff is empty');
  }
  
  console.log(`Clockify in, by files update, ${description}`);
  await $`clockify-cli in --interactive=0 --description="${description}" --billable`.quiet();

  inClockify = true;
  lastInTime = Date.now();
  lastDescription = description;
}

export function startWatchingFiles(filePaths: string[], interval: number = CHECK_INTERVAL) {
  const watchers = filePaths.map(filePath => {
    return watch(filePath, async (event, filename) => {
      if (filename && event === "change") {
        console.log(`Detected ${event} in ${filename}`);
        await performClockifyIn(filePath);
      }
    });
  });

  process.on("SIGINT", () => {
    console.log("Clockify out, by sigint");
    watchers.forEach(watcher => watcher.close());

    if (inClockify) {
      $`clockify-cli out`.then(() => process.exit(0)).catch(() => process.exit(1));
    } else {
      process.exit(0);
    }
  });

  const intervalFn = async () => {
    await performClockifyOut();
    setTimeout(intervalFn, interval);
  };
  intervalFn();
}

const CHECK_INTERVAL = process.env.CHECK_INTERVAL ? parseInt(process.env.CHECK_INTERVAL) : 60 * 60 * 1000;
const WATCH_FILES = process.env.WATCH_FILES ? process.env.WATCH_FILES.split(",") : ["package.json"];

if (import.meta.path === Bun.main) {
  startWatchingFiles(WATCH_FILES, CHECK_INTERVAL);
}
