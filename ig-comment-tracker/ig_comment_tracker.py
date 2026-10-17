#!/usr/bin/env python3
"""Collect the comments an Instagram account left on posts by the accounts it follows.

Instagram has no "all comments by @x" view, so this walks the target's following
list (plus the target's own profile), reads every comment and reply on each post
from the last N days, and keeps the ones written by the target.

Progress lives in a SQLite file, so a run that gets rate-limited can simply be
started again and it picks up where it stopped.
"""

import argparse
import csv
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone

import instaloader
from instaloader.exceptions import (
    ConnectionException,
    InstaloaderException,
    BadCredentialsException,
    LoginRequiredException,
    TooManyRequestsException,
    TwoFactorAuthRequiredException,
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
    username   TEXT PRIMARY KEY,
    position   INTEGER,
    status     TEXT DEFAULT 'pending'   -- pending | done | private | error | failed
);
CREATE TABLE IF NOT EXISTS scanned_posts (
    shortcode  TEXT PRIMARY KEY,
    owner      TEXT,
    scanned_at TEXT
);
CREATE TABLE IF NOT EXISTS comments (
    comment_id  TEXT PRIMARY KEY,
    post_url    TEXT,
    post_owner  TEXT,
    post_date   TEXT,
    created_at  TEXT,
    text        TEXT,
    likes       INTEGER,
    is_reply    INTEGER,
    parent_id   TEXT,
    parent_text TEXT
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
"""

# Pinned posts come first regardless of age, and the occasional out-of-order post
# shows up too, so only stop after this many old posts in a row.
OLD_POSTS_BEFORE_STOP = 3


class RateLimited(Exception):
    pass


class TimeUp(Exception):
    pass


DEADLINE = None


def check_deadline():
    if DEADLINE and time.monotonic() > DEADLINE:
        raise TimeUp


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def open_db(path):
    db = sqlite3.connect(path)
    db.executescript(SCHEMA)
    return db


def login(loader, username, session_file):
    try:
        loader.load_session_from_file(username, session_file)
        if (loader.test_login() or "").lower() == username.lower():
            log(f"Session loaded for @{username}")
            return
        log("Saved session has expired")
    except FileNotFoundError:
        pass

    log(f"Logging in as @{username}")
    password = os.environ.get("IG_PASSWORD")
    try:
        if password:
            loader.login(username, password)
        else:
            loader.interactive_login(username)
    except TwoFactorAuthRequiredException:
        sys.exit("This account has two-factor login on. Use a spare account with 2FA turned off.")
    except BadCredentialsException:
        sys.exit("Wrong password.")
    except ConnectionException as e:
        sys.exit(f"Instagram refused the login: {e}\n"
                 "If it mentions a checkpoint, open Instagram on your phone with this account, "
                 "approve the login ('This was me'), then run again.")
    loader.save_session_to_file(session_file)


def load_accounts(db, loader, target, max_followees):
    """Fill the accounts table once; later runs reuse the cached list."""
    if db.execute("SELECT value FROM meta WHERE key = 'target'").fetchone():
        return
    log(f"Fetching who @{target.username} follows ({target.followees} accounts)")
    names = [target.username]
    for i, followee in enumerate(target.get_followees(), 1):
        names.append(followee.username)
        if i % 100 == 0:
            log(f"  {i} followees listed")
        if max_followees and i >= max_followees:
            break
    db.executemany(
        "INSERT OR IGNORE INTO accounts (username, position) VALUES (?, ?)",
        [(n, i) for i, n in enumerate(names)],
    )
    db.execute("INSERT INTO meta VALUES ('target', ?)", (target.username,))
    db.commit()
    log(f"{len(names)} accounts queued (target's own profile included)")


def is_target(owner, target):
    return owner.userid == target.userid or owner.username.lower() == target.username.lower()


def save_comment(db, post, comment, parent=None):
    db.execute(
        "INSERT OR IGNORE INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            str(comment.id),
            f"https://www.instagram.com/p/{post.shortcode}/",
            post.owner_username,
            post.date_utc.isoformat(),
            comment.created_at_utc.isoformat(),
            comment.text,
            comment.likes_count,
            int(parent is not None),
            str(parent.id) if parent else None,
            parent.text if parent else None,
        ),
    )


def scan_post(db, post, target):
    found = 0
    for comment in post.get_comments():
        if is_target(comment.owner, target):
            save_comment(db, post, comment)
            found += 1
        for answer in comment.answers:
            if is_target(answer.owner, target):
                save_comment(db, post, answer, parent=comment)
                found += 1
    return found


def scan_account(db, loader, username, target, cutoff):
    profile = instaloader.Profile.from_username(loader.context, username)
    if profile.is_private and not profile.followed_by_viewer and profile.userid != loader.context.user_id:
        return "private", 0

    found = 0
    old_in_a_row = 0
    for post in profile.get_posts():
        if post.date_utc.replace(tzinfo=timezone.utc) < cutoff:
            if post.is_pinned:
                continue
            old_in_a_row += 1
            if old_in_a_row >= OLD_POSTS_BEFORE_STOP:
                break
            continue
        old_in_a_row = 0
        check_deadline()

        if db.execute("SELECT 1 FROM scanned_posts WHERE shortcode = ?", (post.shortcode,)).fetchone():
            continue
        if post.comments:
            hits = scan_post(db, post, target)
            found += hits
            if hits:
                log(f"    {hits} comment(s) on {post.shortcode}")
        db.execute(
            "INSERT INTO scanned_posts VALUES (?, ?, ?)",
            (post.shortcode, username, datetime.now(timezone.utc).isoformat()),
        )
        db.commit()
    return "done", found


def export_csv(db, path):
    rows = db.execute(
        "SELECT created_at, post_owner, post_url, post_date, text, likes, is_reply, parent_text "
        "FROM comments ORDER BY created_at DESC"
    ).fetchall()
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["commented_at_utc", "post_owner", "post_url", "post_date_utc",
                         "comment", "likes", "is_reply", "replying_to"])
        writer.writerows(rows)
    log(f"{len(rows)} comments written to {path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("target", help="username whose comments you want (without @)")
    parser.add_argument("--login", required=True, help="your (spare) Instagram account used to log in")
    parser.add_argument("--days", type=int, default=180, help="how far back to look (default 180)")
    parser.add_argument("--max-followees", type=int, default=0, help="only scan the first N followees (0 = all)")
    parser.add_argument("--db", help="progress database (default <target>.db)")
    parser.add_argument("--csv", help="output CSV (default <target>_comments.csv)")
    parser.add_argument("--session-file", help="where to keep the login session (default instaloader's location)")
    parser.add_argument("--max-minutes", type=int, default=0, help="stop cleanly after this long (0 = no limit)")
    parser.add_argument("--export-only", action="store_true", help="just rewrite the CSV from the database")
    args = parser.parse_args()

    target_name = args.target.lstrip("@").lower()
    db = open_db(args.db or f"{target_name}.db")
    csv_path = args.csv or f"{target_name}_comments.csv"
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)

    if args.export_only:
        export_csv(db, csv_path)
        return
    queued = db.execute("SELECT COUNT(*), SUM(status IN ('pending', 'error')) FROM accounts").fetchone()
    if queued[0] and not queued[1]:
        log("Every account is already scanned; nothing left to do")
        export_csv(db, csv_path)
        return
    if args.max_minutes:
        global DEADLINE
        DEADLINE = time.monotonic() + args.max_minutes * 60

    loader = instaloader.Instaloader(
        download_pictures=False, download_videos=False, download_video_thumbnails=False,
        download_comments=False, save_metadata=False, compress_json=False, quiet=True,
    )
    login(loader, args.login, args.session_file)

    try:
        target = instaloader.Profile.from_username(loader.context, target_name)
        if target.is_private and not target.followed_by_viewer:
            sys.exit(f"@{target_name} is private; follow it from @{args.login} first.")
        load_accounts(db, loader, target, args.max_followees)

        pending = db.execute(
            "SELECT username, status FROM accounts WHERE status IN ('pending', 'error') ORDER BY position"
        ).fetchall()
        total = db.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
        log(f"Looking back to {cutoff:%Y-%m-%d}; {len(pending)} of {total} accounts left")

        for i, (username, previous) in enumerate(pending, 1):
            check_deadline()
            log(f"[{total - len(pending) + i}/{total}] @{username}")
            try:
                status, found = scan_account(db, loader, username, target, cutoff)
            except (TooManyRequestsException, ConnectionException, LoginRequiredException) as e:
                raise RateLimited(e)
            except InstaloaderException as e:
                # one retry on a later run, then give up on this account
                status, found = ("failed" if previous == "error" else "error"), 0
                log(f"  skipped ({status}): {e}")
            if status == "private":
                log("  private account, skipped")
            elif found:
                log(f"  {found} comment(s) from @{target_name}")
            db.execute("UPDATE accounts SET status = ? WHERE username = ?", (status, username))
            db.commit()
        log("All accounts scanned")
    except RateLimited as e:
        log(f"Instagram stopped answering ({e}).")
        log("Progress is saved. Wait a few hours, then run the same command again to continue.")
    except TimeUp:
        log(f"Reached the {args.max_minutes}-minute limit; the next run continues from here.")
    except KeyboardInterrupt:
        log("Stopped. Progress is saved; run the same command again to continue.")
    finally:
        db.commit()
        export_csv(db, csv_path)


if __name__ == "__main__":
    main()
