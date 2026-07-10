// An in-memory stand-in for AsyncStorage. Starts EMPTY, like a first launch, but
// remembers writes so the boot test can assert the seed-version gate ran.
const data = new Map<string, string>();

export const __disk = {
  snapshot: () => Object.fromEntries(data),
  seed: (entries: Record<string, string>) => {
    for (const [k, v] of Object.entries(entries)) data.set(k, v);
  },
};

export default {
  getItem: async (k: string) => data.get(k) ?? null,
  setItem: async (k: string, v: string) => void data.set(k, v),
  removeItem: async (k: string) => void data.delete(k),
};
