const fs = require("fs");
const path = require("path");

const root = process.cwd();

const patches = [
  {
    file: path.join(
      root,
      "node_modules",
      "@capacitor",
      "android",
      "capacitor",
      "build.gradle"
    ),
    replacements: [
      ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"]
    ]
  },
  {
    file: path.join(
      root,
      "node_modules",
      "@adplorg",
      "capacitor-in-app-purchase",
      "android",
      "build.gradle"
    ),
    replacements: [
      ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"]
    ]
  },
  {
    file: path.join(
      root,
      "node_modules",
      "@adplorg",
      "capacitor-in-app-purchase",
      "android",
      "src",
      "main",
      "java",
      "com",
      "adplorg",
      "plugins",
      "capacitorinapppurchase",
      "CapacitorInAppPurchasePlugin.java"
    ),
    replacements: []
  },
  {
    file: path.join(
      root,
      "node_modules",
      "@adplorg",
      "capacitor-in-app-purchase",
      "android",
      "src",
      "main",
      "java",
      "com",
      "adplorg",
      "plugins",
      "capacitorinapppurchase",
      "CapacitorInAppPurchase.java"
    ),
    replacements: [
      ['plugin.notifyListeners("transaction", result);', 'plugin.emitTransaction(result);']
    ]
  },
  {
    file: path.join(root, "android", "app", "capacitor.build.gradle"),
    replacements: [
      ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"]
    ]
  }
];

for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    continue;
  }

  let content = fs.readFileSync(patch.file, "utf8");
  let updated = content;
  for (const [from, to] of patch.replacements) {
    while (updated.includes(from)) {
      updated = updated.replace(from, to);
    }
  }

  if (patch.file.endsWith("CapacitorInAppPurchasePlugin.java")) {
    if (!updated.includes("public void emitTransaction(JSObject payload)")) {
      updated = updated.replace(
        "public class CapacitorInAppPurchasePlugin extends Plugin {\n  private CapacitorInAppPurchase implementation;\n",
        "public class CapacitorInAppPurchasePlugin extends Plugin {\n  private CapacitorInAppPurchase implementation;\n\n  public void emitTransaction(JSObject payload) {\n    notifyListeners(\"transaction\", payload);\n  }\n"
      );
    }

    const duplicateMethod = "public void emitTransaction(JSObject payload) {\n    notifyListeners(\"transaction\", payload);\n  }\n\n  public void emitTransaction(JSObject payload) {\n    notifyListeners(\"transaction\", payload);\n  }\n";
    updated = updated.replace(
      duplicateMethod,
      "public void emitTransaction(JSObject payload) {\n    notifyListeners(\"transaction\", payload);\n  }\n"
    );
  }

  if (updated !== content) {
    fs.writeFileSync(patch.file, updated, "utf8");
    console.log(`[patched] ${path.relative(root, patch.file)}`);
  }
}

