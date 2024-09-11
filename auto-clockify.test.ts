import { expect, test } from "bun:test";
import { $ } from "bun";
import { startWatchingFiles } from "./auto-clockify";
import { writeFile, unlink } from "fs/promises";

test("startWatchingFile function", async () => {
  const filePath = 'package.json.temp';
  const customInterval = 3000;

  await writeFile(filePath, JSON.stringify({ version: "1.0.0" }));
  startWatchingFiles([filePath], customInterval);

  await writeFile(filePath, JSON.stringify({ version: "1.0.1" }));
  await Bun.sleep(2000);
  const inOutput = JSON.parse(await $`clockify-cli show --json`.text());
  expect(inOutput[0].billable).toEqual(true);

  await Bun.sleep(2000);
  const outOutput = JSON.parse(await $`clockify-cli show last --json`.text());
  expect(outOutput[0].id).toEqual(inOutput[0].id);

  await unlink(filePath);
  process.exit(0);
});
