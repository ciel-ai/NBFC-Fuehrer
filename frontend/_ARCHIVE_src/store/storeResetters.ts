export const storeResetters: (() => void | Promise<void>)[] = [];

export const resetAllStores = async () => {
  for (const reset of storeResetters) {
    await reset();
  }
};
