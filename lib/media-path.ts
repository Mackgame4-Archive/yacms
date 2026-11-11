export function isLocalMediaPath(value: string) {
  return value.length <= 2048 && value.startsWith("/") && !value.startsWith("//") && !/[\\?#\x00-\x1f]/.test(value) && !value.split("/").some((part) => part === "." || part === "..")
}
