import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";

// Fingerprint the actual frontend inputs, including uncommitted edits. Git
// metadata is deliberately unnecessary in Docker and packaged builds.
export function viewerIdentity(): Plugin {
  let root = "";
  let development = false;
  const moduleId = "\0virtual:viewer-identity";
  function identity() {
    const hash = createHash("sha256");
    function include(path: string) {
      hash.update(relative(root, path));
      hash.update("\0");
      hash.update(readFileSync(path));
      hash.update("\0");
    }
    function directory(path: string) {
      for (const entry of readdirSync(path, { withFileTypes: true }).sort(
        (a, b) => a.name.localeCompare(b.name, "en"),
      )) {
        const child = join(path, entry.name);
        if (entry.isDirectory()) directory(child);
        else if (entry.isFile() && !/\.test\.[tj]sx?$/.test(entry.name))
          include(child);
      }
    }
    directory(join(root, "src"));
    directory(join(root, "public"));
    for (const name of [
      "index.html",
      "package.json",
      "package-lock.json",
      "vite.config.ts",
      "viewerIdentity.ts",
      "tsconfig.json",
    ])
      include(join(root, name));
    return {
      sha256: hash.digest("hex"),
      mode: development ? "Development" : "Packaged",
    };
  }
  return {
    name: "viewer-identity",
    configResolved(config) {
      root = config.root;
      development = config.command === "serve";
    },
    resolveId(id) {
      if (id === "virtual:viewer-identity") return moduleId;
    },
    load(id) {
      if (id === moduleId)
        return `export default ${JSON.stringify(identity())}`;
    },
    configureServer(server) {
      server.watcher.on("all", (_event, path) => {
        const file = relative(root, path);
        if (!(file.startsWith("src/") || file.startsWith("public/"))) return;
        const module = server.moduleGraph.getModuleById(moduleId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({
          type: "custom",
          event: "viewer-identity",
          data: identity(),
        });
      });
    },
  };
}
