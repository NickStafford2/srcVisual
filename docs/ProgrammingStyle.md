Programming style for `srcVisual` should optimize for brevity and clarity first.

Rules:

1. Prefer the simplest code that is easy to read.
   Short, direct code is better than clever or abstract code unless abstraction clearly improves correctness or maintainability.

2. Optimize for clarity over cleverness.
   Names, control flow, and data flow should be obvious to the next reader.

3. Keep code concise.
   Avoid unnecessary helper layers, indirection, and boilerplate when the logic is small.

4. Prefix local variables with `_`.
   Use `_name` for local variables inside functions and methods.

5. Prefix private Python module filenames with `_`.
   If a Python file is only intended for use inside its own package/module area and is not part of the outward-facing module surface, name it like `_example.py`.

6. Keep `__init__.py` empty.
   Do not use `__init__.py` for package APIs or re-exports.

7. Do not use re-exports.
   Import from the real module that owns the code, not from package-level `__init__.py`.

8. Use `_` module filenames for subpackage-private files.
   If a file is only imported inside the same subpackage, prefix it with `_`. Example: if `examples.py` is only used by `routes.py` inside `web/`, it should be `_examples.py`. Test imports do not count when deciding this. If a file is imported from outside that subpackage by non-test code, do not prefix it with `_`.

9. functions not used outside the module it is defined in should be prefixed with a _. if a function is needed outside that module, rewrite it so that it has no _ prefix.

10. Beware Fallbacks
    the frontend should receive a specific and well known data type from the backend.
