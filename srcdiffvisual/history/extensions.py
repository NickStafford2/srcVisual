"""Durable requests to extend allow-listed analyses through srcMove's CLI."""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
from pathlib import Path
import os
import signal
import sqlite3
import subprocess
import tempfile
from threading import Event
import time
from uuid import uuid4

from srcdiffvisual.history.client import read_history_definition, read_history_status, create_history_snapshot
from srcdiffvisual.history.snapshots import publish_thesis_snapshot
from srcdiffvisual.history.repositories import HistoryRepositoryRegistry


def _connect(path: Path) -> sqlite3.Connection:
    _database = sqlite3.connect(path, timeout=30)
    _database.row_factory = sqlite3.Row
    _database.execute("""CREATE TABLE IF NOT EXISTS history_extensions (
        id TEXT PRIMARY KEY, repository_id TEXT NOT NULL, definition_id TEXT NOT NULL,
        target INTEGER NOT NULL, state TEXT NOT NULL, message TEXT NOT NULL,
        created REAL NOT NULL)""")
    _database.execute("""CREATE UNIQUE INDEX IF NOT EXISTS active_history_extension
        ON history_extensions(repository_id) WHERE state IN ('queued', 'running')""")
    _database.commit()
    return _database


def definition_id(repository: Path) -> str:
    return hashlib.sha256(json.dumps(read_history_definition(repository), sort_keys=True).encode()).hexdigest()


def queue_extension(database: Path, registry: HistoryRepositoryRegistry, repository_id: str, count: int) -> dict:
    if isinstance(count, bool) or not isinstance(count, int) or not 1 <= count <= 1000:
        raise ValueError("additional comparisons must be between 1 and 1000")
    _repository = registry.resolve(repository_id).path
    _status = read_history_status(_repository)
    _identity = definition_id(_repository)
    if _status['history']['exhausted']:
        raise ValueError("the frozen repository history is already exhausted")
    with closing(_connect(database)) as _db:
        _db.execute("BEGIN IMMEDIATE")
        _active = _db.execute("SELECT * FROM history_extensions WHERE repository_id=? AND state IN ('queued','running')", (repository_id,)).fetchone()
        if _active is not None:
            return dict(_active)
        _target = _status['coverage']['committed_commit_pairs'] + count
        _id = uuid4().hex
        _db.execute("INSERT INTO history_extensions VALUES (?, ?, ?, ?, 'queued', 'Waiting for the history worker.', ?)", (_id, repository_id, _identity, _target, time.time()))
        _db.commit()
        return read_extension(database, repository_id)


def read_extension(database: Path, repository_id: str) -> dict | None:
    with closing(_connect(database)) as _db:
        _row = _db.execute("SELECT * FROM history_extensions WHERE repository_id=? ORDER BY created DESC LIMIT 1", (repository_id,)).fetchone()
        return None if _row is None else dict(_row)


def _update(database: Path, identifier: str, state: str, message: str) -> None:
    with closing(_connect(database)) as _db:
        _db.execute("UPDATE history_extensions SET state=?,message=? WHERE id=?", (state, message[-8192:], identifier))
        _db.commit()


def recover_extensions(database: Path) -> None:
    with closing(_connect(database)) as _db:
        _db.execute("UPDATE history_extensions SET state='failed', message='Worker stopped; extend again to resume the checkpointed analysis.' WHERE state='running'")
        _db.commit()


def process_extension(database: Path, registry: HistoryRepositoryRegistry, stop: Event) -> bool:
    with closing(_connect(database)) as _db:
        _db.execute("BEGIN IMMEDIATE")
        _row = _db.execute("SELECT * FROM history_extensions WHERE state='queued' ORDER BY created LIMIT 1").fetchone()
        if _row is None:
            return False
        _request = dict(_row)
        _db.execute("UPDATE history_extensions SET state='running' WHERE id=?", (_request['id'],))
        _db.commit()
    try:
        _repository = registry.resolve(_request['repository_id']).path
        if definition_id(_repository) != _request['definition_id']:
            raise ValueError("analysis changed after this extension was queued; submit a new request")
        _command = os.environ.get('SRCDIFFVISUAL_HISTORY_COMMAND', 'srcmove-history')
        _jobs = int(os.environ.get('SRCDIFFVISUAL_HISTORY_JOBS', '4'))
        with tempfile.TemporaryFile() as _log:
            _process = subprocess.Popen([_command, '-C', str(_repository), 'run', '--pairs', str(_request['target']), '--jobs', str(_jobs), '--progress', 'never'], stdout=_log, stderr=_log, start_new_session=True)
            try:
                while _process.poll() is None:
                    if stop.wait(1):
                        raise RuntimeError('Worker stopped; extend again to resume durable progress.')
                    _update(database, _request['id'], 'running', f"Analyzing toward {_request['target']} covered comparisons. Completed results remain available.")
            finally:
                if _process.poll() is None:
                    os.killpg(_process.pid, signal.SIGTERM)
                    try:
                        _process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        os.killpg(_process.pid, signal.SIGKILL)
                        _process.wait()
            _log.seek(0, 2)
            _log.seek(max(0, _log.tell() - 8192))
            _message = _log.read().decode(errors='replace')
            _status = read_history_status(_repository)
            _reached = _status['coverage']['committed_commit_pairs'] >= _request['target'] or _status['history']['exhausted']
            if _reached:
                _snapshot = create_history_snapshot(_repository)
                publish_thesis_snapshot(_snapshot, _request['repository_id'])
            _update(database, _request['id'], 'completed' if _reached else 'failed', _message)
    except Exception as _error:
        _update(database, _request['id'], 'failed', str(_error))
    return True
