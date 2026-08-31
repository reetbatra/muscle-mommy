/**
 * macOS caches a negative DNS lookup for a while after a record is created.
 * This pins the host to the address `dig` reports so a verification run does
 * not have to wait for a resolver that is only stale locally.
 */
import dns from "node:dns";
import { execSync } from "node:child_process";

const host = process.env.PIN_HOST;
if (host) {
  const address = execSync(`dig +short ${host} A | tail -1`).toString().trim();
  if (address) {
    const original = dns.lookup;
    dns.lookup = (hostname, options, callback) => {
      if (hostname === host) {
        const cb = typeof options === "function" ? options : callback;
        const wantsAll = typeof options === "object" && options?.all;
        return cb(null, wantsAll ? [{ address, family: 4 }] : address, 4);
      }
      return original(hostname, options, callback);
    };
    console.log(`[dns-pin] ${host} -> ${address}`);
  }
}
