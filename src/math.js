/**
 * Math Quiz Game Generator
 * Generates random math problems with different difficulty levels
 */

/**
 * Game difficulty modes configuration
 * [minA, maxA, minB, maxB, operations, timeLimit, bonusPoints]
 */
export const modes = {
  noob: [-3, 3, -3, 3, '+-', 15000, 10],
  easy: [-10, 10, -10, 10, '*/+-', 20000, 40],
  medium: [-40, 40, -20, 20, '*/+-', 40000, 150],
  hard: [-100, 100, -70, 70, '*/+-', 60000, 350],
  extreme: [-999999, 999999, -999999, 999999, '*/', 99999, 9999],
  impossible: [-99999999999, 99999999999, -99999999999, 999999999999, '*/', 30000, 35000],
  impossible2: [-999999999999999, 999999999999999, -999, 999, '/', 30000, 50000]
};

/**
 * Operator display mappings
 */
export const operators = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷'
};

/**
 * Generate random integer between two values
 * @param {number} from - Minimum value (inclusive)
 * @param {number} to - Maximum value (exclusive)
 * @returns {number} Random integer
 */
export function randomInt(from, to) {
  if (from > to) [from, to] = [to, from];
  from = Math.floor(from);
  to = Math.floor(to);
  return Math.floor((to - from) * Math.random() + from);
}

/**
 * Pick random element from array
 * @param {Array} list - Array to pick from
 * @returns {*} Random element
 */
export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Generate math problem based on difficulty mode
 * @param {string} mode - Difficulty mode (noob, easy, medium, hard, extreme, impossible, impossible2)
 * @returns {Promise<Object>} Math problem object with question, answer, time limit, and bonus
 */
export function genMath(mode) {
  return new Promise((resolve, reject) => {
    if (!modes[mode]) {
      return reject(new Error(`Invalid mode: ${mode}. Valid modes: ${Object.keys(modes).join(', ')}`));
    }

    const [a1, a2, b1, b2, ops, time, bonus] = modes[mode];
    let a = randomInt(a1, a2);
    let b = randomInt(b1, b2);
    const op = pickRandom([...ops]);

    // Calculate result
    let result = (new Function(`return ${a} ${op.replace('/', '*')} ${b < 0 ? `(${b})` : b}`))();

    // For division, swap to ensure integer results
    if (op === '/') [a, result] = [result, a];

    const problem = {
      soal: `${a} ${operators[op]} ${b}`,
      mode: mode,
      waktu: time,
      hadiah: bonus,
      jawaban: result
    };

    resolve(problem);
  });
}
