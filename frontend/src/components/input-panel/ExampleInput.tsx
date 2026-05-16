import { SampleButton } from "./SampleButton";

type ExampleEntry = {
  filename: string;
  label: string;
};

type ExampleGroup = {
  id: string;
  title: string;
  examples: ExampleEntry[];
};

type ExampleInputProps = {
  exampleFilenames: string[];
  examplesError: string | null;
  isLoadingExample: boolean;
  disabled: boolean;
  loadedExampleFilename: string | null;
  onLoadExample: (filename: string) => void;
};

export function ExampleInput({
  exampleFilenames,
  examplesError,
  isLoadingExample,
  disabled,
  loadedExampleFilename,
  onLoadExample,
}: ExampleInputProps) {
  const _exampleGroups = buildExampleGroups(exampleFilenames);
  const _loadedExampleLabel = loadedExampleFilename
    ? formatExampleLabel(loadedExampleFilename)
    : null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-medium text-slate-100">Examples</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Load a known srcDiff file from the repo, then submit it directly.
        </p>

        {_loadedExampleLabel ? (
          <p className="mt-3 text-xs text-emerald-300">
            Loaded example: {_loadedExampleLabel}
          </p>
        ) : null}

        <div className="mt-3 space-y-4">
          {_exampleGroups.map((group) => (
            <section key={group.id} aria-label={`${group.title} examples`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {group.title}
              </p>

              <div className="flex flex-wrap gap-2">
                {group.examples.map((example) => (
                  <SampleButton
                    key={example.filename}
                    disabled={disabled || isLoadingExample}
                    onClick={() => onLoadExample(example.filename)}
                  >
                    {example.label}
                  </SampleButton>
                ))}
              </div>
            </section>
          ))}
        </div>

        {exampleFilenames.length === 0 && !examplesError ? (
          <p className="mt-3 text-xs text-slate-400">
            {isLoadingExample ? "Loading example..." : "No examples found."}
          </p>
        ) : null}

        {examplesError ? (
          <p className="mt-3 text-xs text-red-300">{examplesError}</p>
        ) : null}
      </div>
    </div>
  );
}

function buildExampleGroups(exampleFilenames: string[]): ExampleGroup[] {
  const _customExamples: ExampleEntry[] = [];
  const _generatedExamples: ExampleEntry[] = [];
  const _otherExamples: ExampleEntry[] = [];

  for (const _filename of exampleFilenames) {
    const _entry = {
      filename: _filename,
      label: formatExampleLabel(_filename),
    };

    if (_filename.startsWith("e2e_custom_")) {
      _customExamples.push(_entry);
      continue;
    }

    if (_filename.startsWith("e2e_generated_")) {
      _generatedExamples.push(_entry);
      continue;
    }

    _otherExamples.push(_entry);
  }

  const _groups: ExampleGroup[] = [];

  if (_customExamples.length > 0) {
    _groups.push({
      id: "custom",
      title: "Custom",
      examples: _customExamples,
    });
  }

  if (_generatedExamples.length > 0) {
    _groups.push({
      id: "generated",
      title: "Generated",
      examples: _generatedExamples,
    });
  }

  if (_otherExamples.length > 0) {
    _groups.push({
      id: "other",
      title: "Other",
      examples: _otherExamples,
    });
  }

  return _groups;
}

function formatExampleLabel(filename: string): string {
  return filename
    .replace(/^e2e_custom_/, "")
    .replace(/^e2e_generated_/, "");
}
