// The integration seeds run without persistence, exactly like a first launch.
export default {
  getItem: async () => null,
  setItem: async () => {},
};
