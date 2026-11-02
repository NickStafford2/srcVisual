"""Host-only recovery helper checks; no native tools, Docker, or network."""

import contextlib
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from scripts.prepare_workspace import REFERENCES, prepare_workspace


class PrepareWorkspaceTests(unittest.TestCase):
    def setUp(self):
        self._temp = tempfile.TemporaryDirectory(prefix="viewer-prepare-test-")
        self.addCleanup(self._temp.cleanup)
        self._root = Path(self._temp.name) / "workspace"
        for _name in ("srcML", "srcReader", "srcDiff", "srcMove", "srcDiffVisual"):
            (self._root / _name / ".git").mkdir(parents=True)
        _binary = self._root / "srcMove/build/srcMove"
        _binary.parent.mkdir()
        _binary.write_bytes(b"fixture executable")
        self._base = self._root / "srcMove/reference-repositories"
        self._base.mkdir()
        _source = Path(self._temp.name) / "source"
        subprocess.run(["git", "init", "-q", str(_source)], check=True)
        (_source / "example.c").write_text("int x;\n")
        subprocess.run(["git", "-C", str(_source), "add", "example.c"], check=True)
        subprocess.run([
            "git", "-C", str(_source), "-c", "user.name=Fixture",
            "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Fixture",
        ], check=True)
        self._commit = subprocess.check_output(
            ["git", "-C", str(_source), "rev-parse", "HEAD"], text=True
        ).strip()
        self._registry = {_name: {"checkout": _name} for _name in REFERENCES}
        self._inventory = {
            _name: {"origin": str(_source), "commit": self._commit}
            for _name in REFERENCES
        }
        self._save()

    def _save(self):
        for _file, _data in (("repositories.json", self._registry),
                              ("recovery-inventory.json", self._inventory)):
            (self._base / _file).write_text(json.dumps({
                "schema_version": 1, "repositories": _data,
            }))

    def _prepare(self, _apply=False):
        with contextlib.redirect_stdout(io.StringIO()):
            prepare_workspace(self._root, _apply=_apply)

    def test_preview_creates_nothing(self):
        self._prepare()
        self.assertFalse((self._base / "linux").exists())
        self.assertFalse((self._root / "thesis-workspace").exists())

    def test_apply_uses_git_objects_and_keeps_existing_clones(self):
        self._prepare(True)
        self.assertFalse((self._base / "linux/example.c").exists())
        _content = subprocess.check_output([
            "git", "-C", str(self._base / "linux"), "show", "HEAD:example.c",
        ], text=True)
        self.assertEqual(_content, "int x;\n")
        self.assertTrue((self._base / "linux/.srcmove-whole").is_dir())
        _file = self._base / "sqlite/example.c"
        _file.write_text("local edit\n")
        self._prepare(True)
        self.assertEqual(_file.read_text(), "local edit\n")

    def test_missing_binary_fails_before_mutation(self):
        (self._root / "srcMove/build/srcMove").unlink()
        with self.assertRaisesRegex(ValueError, "make build"):
            self._prepare(True)
        self.assertFalse((self._base / "notepadpp").exists())

    def test_checkout_cannot_escape_reference_root(self):
        self._registry["linux"]["checkout"] = "../escaped"
        self._save()
        with self.assertRaisesRegex(ValueError, "Invalid checkout"):
            self._prepare(True)
        self.assertFalse((self._base / "notepadpp").exists())

    def test_symlink_cannot_escape_reference_root(self):
        (self._base / "linux").symlink_to(Path(self._temp.name), target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Path escapes"):
            self._prepare(True)
        self.assertFalse((self._base / "notepadpp").exists())

    def test_fake_git_mount_is_rejected_before_cloning(self):
        (self._base / "sqlite/.git").mkdir(parents=True)
        with self.assertRaisesRegex(ValueError, "non-clone"):
            self._prepare(True)
        self.assertFalse((self._base / "notepadpp").exists())


if __name__ == "__main__":
    unittest.main()
