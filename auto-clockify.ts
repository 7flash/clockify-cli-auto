import { watch } from "fs";
import { $ } from "bun";
import { format } from "date-fns";

let lastInTime = Date.now();
let lastOutTime = Date.now();
let inClockify = false;
let lastDescription = '';

function getFormattedTime() {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
}

async function performClockifyOut() {
  if (inClockify) {
    console.log(`[${getFormattedTime()}] Clockify out, by interval`);
    await $`clockify-cli out`.quiet();

    if (lastInTime > lastOutTime) {
      console.log(`[${getFormattedTime()}] Clockify in, restarted because of recent activity`);
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
    const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
    const changedFiles = await $`cd ${folderPath} && git diff --name-only HEAD~1 HEAD | xargs -n 1 basename | paste -sd, -`.text(); 
    description = changedFiles.replace(/package.json,?/g, "").trim();
  } catch (err) {
    console.info(`[${getFormattedTime()}] Warning: git diff is empty`);
  }
  
  console.log(`[${getFormattedTime()}] Clockify in, by files update, ${description}`);
  await $`clockify-cli in --interactive=0 --description="${description}" --billable`.quiet();

  inClockify = true;
  lastInTime = Date.now();
  lastDescription = description;
}

export function startWatchingFiles(filePaths: string[], interval: number = CHECK_INTERVAL) {
  const watchers = filePaths.map(filePath => {
    return watch(filePath, async (event, filename) => {
      if (filename && event === "change") {
        console.log(`[${getFormattedTime()}] Detected ${event} in ${filename}`);
        await performClockifyIn(filePath);
      }
    });
  });

  process.on("SIGINT", () => {
    console.log(`[${getFormattedTime()}] Clockify out, by SIGINT`);
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
  console.log('Starting.. ', getFormattedTime());
  startWatchingFiles(WATCH_FILES, CHECK_INTERVAL);
}
