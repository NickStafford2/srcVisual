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
