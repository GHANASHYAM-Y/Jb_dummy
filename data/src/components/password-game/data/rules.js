function isPrime(num) {
  if (num < 2) return false;

  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }

  return true;
}

function getUtcDayOfYear() {
  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return String(Math.floor((today - startOfYear) / 86400000)).padStart(3, "0");
}

const planets = [
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

const pieces = [
  "king",
  "queen",
  "rook",
  "bishop",
  "knight",
  "pawn",
];

const specialCharacterPattern = /[^a-zA-Z0-9\s]/u;
const specialCharacterCountPattern = /[^a-zA-Z0-9\s]/gu;
export const rules = [
  // Chapter 1 - Foundation

  {
    id: 1,
    category: "Foundation",
    text: "Must be at least 8 characters long",
    check: (password) => password.length >= 8,
  },

  {
    id: 2,
    category: "Foundation",
    text: "Must contain a number",
    check: (password) => /\d/.test(password),
  },

  {
    id: 3,
    category: "Foundation",
    text: "Must contain an uppercase letter",
    check: (password) => /[A-Z]/.test(password),
  },

  {
    id: 4,
    category: "Foundation",
    text: "Must contain a special character",
  check: (password) => specialCharacterPattern.test(password),
  },

  // Chapter 2 - Space

  {
    id: 5,
    category: "Space",
    text: "Must contain a planet name",
    check: (password) =>
      planets.some((planet) =>
        password.toLowerCase().includes(planet)
      ),
  },

  {
  id: 6,
  category: "Space",
  text: "Must contain a prime number",

  check: (password) => {
    const numbers = password.match(/\d+/g);

    if (!numbers) return false;

    return numbers.some(
      (num) =>
        isPrime(Number(num)) &&
        Number(num) > 10
    );
  },

  getText: (password) => {
    const numbers = password.match(/\d+/g);

    if (!numbers) {
      return "Must contain a prime number";
    }

    const primes = numbers.filter((num) =>
      isPrime(Number(num))
    );

    if (primes.length === 0) {
      return "Must contain a prime number";
    }

    const hasLargePrime = primes.some(
      (num) => Number(num) > 10
    );

    if (!hasLargePrime) {
      return "The prime number must be greater than 10";
    }

    return "Must contain a prime number";
  },
},

  // Chapter 3 - Time

  {
  id: 7,
  category: "Time",
  text: "Must contain today's weekday",

  check: (password) => {
    const lower = password.toLowerCase();

    const today = new Date()
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toLowerCase();

    if (!lower.includes(today)) {
      return false;
    }

    const weekdayIndex = lower.indexOf(today);

    const planetIndex = planets
      .map((planet) => lower.indexOf(planet))
      .find((index) => index !== -1);

    if (
      planetIndex !== undefined &&
      planetIndex > weekdayIndex
    ) {
      return false;
    }

    return true;
  },

  getText: (password) => {
    const lower = password.toLowerCase();

    const today = new Date()
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toLowerCase();

    if (!lower.includes(today)) {
      return "Must contain today's weekday";
    }

    const weekdayIndex = lower.indexOf(today);

    const planetIndex = planets
      .map((planet) => lower.indexOf(planet))
      .find((index) => index !== -1);

    if (
      planetIndex !== undefined &&
      planetIndex > weekdayIndex
    ) {
      return "Planet name must appear before today's weekday.";
    }

    return "Must contain today's weekday";
  },
},

  // Chapter 4 - Language

  {
    id: 8,
    category: "Language",
    text: "Number of vowels must equal number of consonants",
    check: (password) => {
      const letters =
        password.toLowerCase().match(/[a-z]/g) || [];

      const vowels =
        letters.filter((c) =>
          "aeiou".includes(c)
        ).length;

      const consonants =
        letters.filter(
          (c) => !"aeiou".includes(c)
        ).length;

      return vowels > 0 && vowels === consonants;
    },
  },

  {
    id: 9,
    category: "Language",
    text: "Must contain exactly 3 uppercase letters",
    check: (password) => {
      const uppercase =
        password.match(/[A-Z]/g) || [];

      return uppercase.length === 3;
    },
  },

  {
    id: 10,
    category: "Language",
    text: "The password must start and end with the same character, and that character must also be the first and last letter of a word in the password",
    check: (password) => {
      password = password.trim();

      if (password.length < 2) return false;

      const firstChar = password[0].toLowerCase();
      const lastChar = password[password.length - 1].toLowerCase();

      if (firstChar !== lastChar) return false;

      const words = password.match(/[a-zA-Z]+/g) || [];

      return words.some((word) => {
        word = word.toLowerCase();

        return (
          word.length > 1 &&
          word[0] === firstChar &&
          word[word.length - 1] === firstChar
        );
      });
    },
  },

  // Chapter 5 - Games

  {
    id: 11,
    category: "Games",
    text: "Must contain a chess piece name",
    check: (password) =>
      pieces.some((piece) =>
        password.toLowerCase().includes(piece)
      ),
  },

  // Chapter 6 - Mathematics

  {
    id: 12,
    category: "Mathematics",
  text: "Sum of all digits must be between 30 and 40",
    check: (password) => {
      const digits =
        password.match(/\d/g)?.map(Number) || [];

      const sum = digits.reduce(
        (a, b) => a + b,
        0
      );

      return sum >= 30 && sum <= 40;
    },
  },

  {
    id: 13,
    category: "Mathematics",
    text: "ASCII sum of vowels must be greater than 500",
    check: (password) => {
      const vowels =
        password.match(/[aeiouAEIOU]/g) || [];

      const total = vowels.reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0
      );

      return total > 500;
    },
  },

  // Chapter 7 - Symbols

  {
    id: 14,
    category: "Symbols",
    text: "Password must contain a face emoji.",
    check: (password) =>
      /[\u{1F600}-\u{1F64F}]/u.test(password),
  },

  {
    id: 15,
    category: "Mathematics",
    text: "Password length, counting each emoji as one character, must be a prime number",
    check: (password) => isPrime(Array.from(password).length),
  },

  {
    id: 16,
    category: "Stability",
    text: "The planet and chess piece must have the same number of letters.",
    check: (password) => {
      const lower = password.toLowerCase();

      const planet = planets.find((planet) =>
        lower.includes(planet)
      );

      const piece = pieces.find((piece) =>
        lower.includes(piece)
      );

      if (!planet || !piece) {
        return false;
      }

      return planet.length === piece.length;
    },
  },

{
  id: 17,
  category: "Balance",
  text: "The number of special characters must be greater than the number of digits.",
  check: (password) => {
    const digitCount =
      password.match(/\d/g)?.length || 0;

    const specialCount =
      password.match(specialCharacterCountPattern)?.length || 0;

    return specialCount > digitCount;
  },
},

{
  id: 18,
  category: "Economy",

  text: "Must contain the current USD → INR exchange rate rounded down.",

  // Exchange-rate data is loaded once in App.jsx, never during typing.
  check: (password, liveData) =>
    liveData.exchangeRate !== null &&
    liveData.exchangeRate !== undefined &&
    password.includes(liveData.exchangeRate.toString()),

  getText: (_password, liveData) =>
    liveData.exchangeRateStatus === "loading"
      ? "Loading the current USD → INR exchange rate…"
      : liveData.exchangeRateStatus === "unavailable"
        ? "The USD → INR exchange rate is unavailable. Retry the live-data request."
        : `Must contain the current USD → INR exchange rate rounded down (${liveData.exchangeRate}).`,
},

  {
    id: 19,
    category: "Time",
    text: "Include today's day number within the year as three digits. For example, day 7 is written as 007.",
    check: (password) => password.includes(getUtcDayOfYear()),
    getText: () => "Include today's day number within the year as three digits. For example, day 7 is written as 007.",
  },

  {
    id: 20,
    category: "Mathematics",
    text: "Prime Paradox: Include an exactly five-digit number that is both a palindrome and prime. For example, 10301.",
    check: (password) =>
      (password.match(/\d+/g) || []).some(
        (number) =>
          number.length === 5 &&
          number === Array.from(number).reverse().join("") &&
          isPrime(Number(number)),
      ),
  },

  {
    id: 21,
    category: "Wordplay",
    text: "Word Collision: Include two different English words that overlap by at least three consecutive letters in the same positions. The shared letters count as part of both words, and neither word may be entirely inside the other.",
    check: (password, liveData) =>
      liveData.hasWordCollision?.(password) ?? false,
    getText: (_password, liveData) => {
      if (liveData.wordCollisionStatus === "error") {
        return "The English dictionary could not be loaded. Refresh the game to retry.";
      }

      if (liveData.wordCollisionStatus !== "ready") {
        return "Loading the English dictionary. Then add two words that overlap by at least three letters, without one word being inside the other.";
      }

      return "Word Collision: Include two different English words that overlap by at least three consecutive letters in the same positions. The shared letters count as part of both words, and neither word may be entirely inside the other.";
    },
  },

  {
    id: 22,
    category: "Chemistry",
    text: "Periodic Mystery: Must contain the chemical symbol Ne with exact capitalization.",
    check: (password) => password.includes("Ne"),
  },

  {
    id: 23,
    category: "Maritime",
    text: "Your password must contain a word represented by a valid international maritime signal flag.",
    check: (password, liveData) =>
      liveData.hasSignalFlagWord?.(password) ?? false,
    getText: (_password, liveData) => {
      if (liveData.signalFlagStatus === "error") {
        return "The international signal flag vocabulary could not be loaded. Retry the source request.";
      }

      if (liveData.signalFlagStatus !== "ready") {
        return "Loading the international maritime signal flag vocabulary…";
      }

      return "Your password must contain a complete word represented by a valid international maritime signal flag.";
    },
  },

  {
    id: 24,
    category: "Signals",
    text: "Morse Mystery: Your password must contain a letter whose International Morse code consists of only one element.",
    check: (password, liveData) =>
      liveData.hasSingleElementMorseLetter?.(password) ?? false,
    getText: (_password, liveData) => {
      if (liveData.morseCodeStatus === "error") {
        return "The International Morse code alphabet could not be loaded. Retry the source request.";
      }

      if (liveData.morseCodeStatus !== "ready") {
        return "Loading the International Morse code alphabet…";
      }

      return "Morse Mystery: Include a letter whose International Morse code consists of only one element.";
    },
  },

  {
    id: 25,
    category: "Signals",
    text: "Phonetic Challenge: Your password must contain a complete NATO phonetic alphabet codeword.",
    check: (password, liveData) =>
      liveData.hasNatoCodeword?.(password) ?? false,
    getText: (_password, liveData) => {
      if (liveData.natoAlphabetStatus === "error") {
        return "The NATO phonetic alphabet could not be loaded. Retry the source request.";
      }

      if (liveData.natoAlphabetStatus !== "ready") {
        return "Loading the NATO phonetic alphabet…";
      }

      return "Phonetic Challenge: Include a complete NATO phonetic alphabet codeword.";
    },
  },

  {
    id: 26,
    category: "Language",
    text: "Greek Secret: Your password must contain the English name of a Greek letter that is also a recognized English word.",
    check: (password, liveData) =>
      liveData.hasGreekEnglishWord?.(password) ?? false,
    getText: (_password, liveData) => {
      if (liveData.greekEnglishWordsStatus === "error") {
        return "Greek letter names could not be verified against the English dictionary. Retry the source requests.";
      }

      if (liveData.greekEnglishWordsStatus !== "ready") {
        return "Loading Greek letter names and checking them against the English dictionary…";
      }

      return "Greek Secret: Include a complete English word that is also the name of a Greek letter.";
    },
  },

  // Chapter 8 - Chaos.
  {
    id: "chaos-fire",
    category: "Chaos",
    chaosEffect: "fire",
    text: "Invoke fire by including the word \"fire\"",
    check: (password) => /\bfire\b/i.test(password),
  },
  {
    id: "chaos-water",
    category: "Chaos",
    chaosEffect: "water",
    text: "Invoke water by including the word \"water\"",
    check: (password) => password.toLowerCase().includes("water"),
  },
  {
    id: "chaos-lightning",
    category: "Chaos",
    chaosEffect: "lightning",
    text: "Invoke lightning by including the word \"lightning\"",
    check: (password) => password.toLowerCase().includes("lightning"),
  },
  {
    id: "chaos-ice",
    category: "Chaos",
    chaosEffect: "ice",
    text: "Invoke ice by including the word \"ice\"",
    check: (password) => password.toLowerCase().includes("ice"),
  },
  {
    id: "chaos-tornado",
    category: "Chaos",
    chaosEffect: "tornado",
    text: "Invoke a tornado by including the word \"tornado\"",
    check: (password) => password.toLowerCase().includes("tornado"),
  },
  {
    id: "chaos-volcano",
    category: "Chaos",
    chaosEffect: "volcano",
    text: "Invoke the volcano by including the word \"volcano\"",
    check: (password) => password.toLowerCase().includes("volcano"),
  },
  {
    id: "chaos-lightning-bolt",
    category: "Chaos",
    chaosEffect: "lightning",
    text: "Must contain a lightning bolt emoji to arm the storm",
    check: (password) => /\u{26A1}/u.test(password),
  }

];
