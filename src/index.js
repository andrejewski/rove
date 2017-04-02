export default function leftPad (str, len, char = ' ') {
  while (str.length < len) {
    str = char + str
  }
  return str
}
