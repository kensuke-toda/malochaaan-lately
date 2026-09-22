const ISBN13_PREFIXES = ["978", "979"] as const;

export function digitsOnlyIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function isbn13CheckDigit(body12: string) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

function isValidIsbn13(isbn: string) {
  if (!/^\d{13}$/.test(isbn)) return false;
  return isbn[12] === isbn13CheckDigit(isbn.slice(0, 12));
}

function isValidIsbn10(isbn: string) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(isbn[i]) * (10 - i);
  }
  const check = isbn[9] === "X" ? 10 : Number(isbn[9]);
  return (sum + check) % 11 === 0;
}

function isbn10To13(isbn10: string) {
  const body = `978${isbn10.slice(0, 9)}`;
  return `${body}${isbn13CheckDigit(body)}`;
}

export function isBookIsbn(isbn: string) {
  return ISBN13_PREFIXES.some((prefix) => isbn.startsWith(prefix)) && isValidIsbn13(isbn);
}

/** Returns a 13-digit book ISBN (978/979) or null. */
export function normalizeIsbn(raw: string): string | null {
  const compact = digitsOnlyIsbn(raw.trim());
  if (compact.length === 10 && isValidIsbn10(compact)) {
    const isbn13 = isbn10To13(compact);
    return isBookIsbn(isbn13) ? isbn13 : null;
  }
  if (compact.length === 13 && isBookIsbn(compact)) return compact;
  return null;
}

export function classifyScannedCode(raw: string): { isbn: string } | { error: string } {
  const compact = digitsOnlyIsbn(raw);
  const isbn = normalizeIsbn(raw);
  if (isbn) return { isbn };
  if (/^\d{8,14}$/.test(compact)) return { error: "本のバーコードではありません" };
  return { error: "バーコードを読み取れませんでした。ピントを合わせて撮り直すか、ISBNを入力してください。" };
}
