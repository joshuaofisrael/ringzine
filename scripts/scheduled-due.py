#!/usr/bin/env python3
"""Print whether any story should publish on this scheduled deploy.

A story is due when its publishAt is in the past, or within five minutes,
and not older than 18 hours. That window covers a late GitHub runner and
the next same day slot, then stops so later days do not redeploy forever.
workflow_dispatch ignores this script and always deploys.
"""
import datetime
import os
import pathlib
import re

WINDOW = 18 * 60 * 60
EARLY = 5 * 60
POSTS = pathlib.Path("src/content/posts")
STAMP = re.compile(r'^publishAt:\s*["\']?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)', re.M)
DRAFT = re.compile(r"^draft:\s*true\s*$", re.M)


def due(now):
    found = []
    for path in sorted(POSTS.glob("*.md")):
        text = path.read_text()
        if DRAFT.search(text):
            continue
        match = STAMP.search(text)
        if not match:
            continue
        when = datetime.datetime.strptime(match.group(1), "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=datetime.timezone.utc
        )
        delta = (now - when).total_seconds()
        if -EARLY <= delta <= WINDOW:
            found.append((path.name, when.isoformat(), int(delta)))
    return found


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    found = due(now)
    flag = "true" if found else "false"
    for name, when, delta in found:
        print(f"due {name} at {when} ({delta}s ago)")
    if not found:
        print("No scheduled story is due.")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"due={flag}\n")


if __name__ == "__main__":
    main()
