// utils/random.js
// Helper untuk angka random

/**
 * Mengembalikan integer random antara min dan max (inklusif)
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Memilih elemen random dari array
 */
export function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

/**
 * Menjumlahkan digit suatu angka secara berulang
 * hingga tersisa satu digit (digital root)
 * Contoh: 29 -> 2+9=11 -> 1+1=2
 */
export function digitalRoot(num) {
  let n = Math.abs(num);
  while (n >= 10) {
    n = String(n)
      .split("")
      .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
  }
  return n;
}

export default { randomInt, randomChoice, digitalRoot };
