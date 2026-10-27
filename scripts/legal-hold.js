// Usage:
//   node scripts/legal-hold.js check [dir]        exit 1 if a published post must be held
//   node scripts/legal-hold.js scan <file>        print the flags for one post
//   node scripts/legal-hold.js hold <file> "why"  make it a HOLD_REVIEW draft and append to the queue
import fs from "node:fs";
import { checkPost, formatGate, gatePostsDir, holdPost, loadImageRegister } from "../lib/legal-hold.js";

const [cmd, target = "src/content/posts", suggestion = ""] = process.argv.slice(2);
const queueFile = process.env.HOLD_QUEUE_FILE || "/workspace/content-review/queue.jsonl";

if (cmd === "check") {
  const result = gatePostsDir(target);
  if (result.held.length) console.log(`Held drafts (not published): ${result.held.join(", ")}`);
  if (!result.ok) {
    console.error(`Legal hold gate failed. These posts need Joshua's review before publishing:\n${formatGate(result)}`);
    process.exit(1);
  }
  console.log("Legal hold gate passed.");
} else if (cmd === "scan") {
  console.log(JSON.stringify(checkPost(fs.readFileSync(target, "utf8"), { images: loadImageRegister() }).flags, null, 2));
} else if (cmd === "hold") {
  const { flags } = checkPost(fs.readFileSync(target, "utf8"), { images: loadImageRegister() });
  console.log(JSON.stringify(holdPost(target, { queueFile, flags, suggestion })));
} else {
  console.error("usage: legal-hold.js check|scan|hold <path>");
  process.exit(2);
}
