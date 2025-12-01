/**
 * Jest Setup für Node.js ES-Module Umgebung
 * Stellt notwendige Node.js Globals bereit
 */

// Node.js Timer-Funktionen für Jest bereitstellen
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = (fn, ...args) => {
    return setTimeout(() => fn(...args), 0);
  };
}

if (typeof global.clearImmediate === "undefined") {
  global.clearImmediate = (id) => {
    return clearTimeout(id);
  };
}

// Buffer für Node.js-Kompatibilität
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

// Process-Umgebung sicherstellen
process.env.NODE_ENV = process.env.NODE_ENV || "test";

// Mock für problematische Node.js APIs
global.process.nextTick =
  global.process.nextTick ||
  ((fn, ...args) => {
    return setImmediate(() => fn(...args));
  });
