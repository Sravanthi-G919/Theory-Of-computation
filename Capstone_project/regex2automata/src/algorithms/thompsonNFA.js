/*
  Regex2Automata
  Thompson's Construction: Postfix Regex -> NFA
*/

export function buildNFA(postfix) {
  let stateCount = 0;

  const transitions = [];
  const stack = [];

  // Create unique state IDs
  function newState() {
    return stateCount++;
  }

  // Add an edge to the NFA
  function addTransition(from, to, symbol) {
    transitions.push({ from, to, symbol });
  }

  // Create an NFA fragment for a single symbol
  function createSymbolNFA(symbol) {
    const start = newState();
    const end = newState();

    addTransition(start, end, symbol);

    return { start, end };
  }

  // Process postfix expression
  for (const token of postfix) {

    // ----------------------------------
    // 1. SYMBOL
    // ----------------------------------
    if (!["|", ".", "*", "+", "?"].includes(token)) {
      stack.push(createSymbolNFA(token));
    }

    // ----------------------------------
    // 2. CONCATENATION
    // ----------------------------------
    else if (token === ".") {
      if (stack.length < 2) {
        throw new Error("Invalid concatenation in regex.");
      }

      const second = stack.pop();
      const first = stack.pop();

      // Connect first fragment to second fragment
      addTransition(first.end, second.start, "ε");

      stack.push({
        start: first.start,
        end: second.end,
      });
    }

    // ----------------------------------
    // 3. UNION ( | )
    // ----------------------------------
    else if (token === "|") {
      if (stack.length < 2) {
        throw new Error("Invalid union in regex.");
      }

      const second = stack.pop();
      const first = stack.pop();

      const start = newState();
      const end = newState();

      // Branch into either fragment
      addTransition(start, first.start, "ε");
      addTransition(start, second.start, "ε");

      // Merge both branches
      addTransition(first.end, end, "ε");
      addTransition(second.end, end, "ε");

      stack.push({ start, end });
    }

    // ----------------------------------
    // 4. KLEENE STAR ( * )
    // Zero or more repetitions
    // ----------------------------------
    else if (token === "*") {
      if (stack.length < 1) {
        throw new Error("Invalid Kleene star in regex.");
      }

      const fragment = stack.pop();

      const start = newState();
      const end = newState();

      // Enter fragment or skip it
      addTransition(start, fragment.start, "ε");
      addTransition(start, end, "ε");

      // Repeat or exit
      addTransition(fragment.end, fragment.start, "ε");
      addTransition(fragment.end, end, "ε");

      stack.push({ start, end });
    }

    // ----------------------------------
    // 5. PLUS ( + )
    // One or more repetitions
    // ----------------------------------
    else if (token === "+") {
      if (stack.length < 1) {
        throw new Error("Invalid plus operator in regex.");
      }

      const fragment = stack.pop();

      const start = newState();
      const end = newState();

      // Must enter the fragment at least once
      addTransition(start, fragment.start, "ε");

      // Repeat or exit
      addTransition(fragment.end, fragment.start, "ε");
      addTransition(fragment.end, end, "ε");

      stack.push({ start, end });
    }

    // ----------------------------------
    // 6. OPTIONAL ( ? )
    // Zero or one occurrence
    // ----------------------------------
    else if (token === "?") {
      if (stack.length < 1) {
        throw new Error("Invalid optional operator in regex.");
      }

      const fragment = stack.pop();

      const start = newState();
      const end = newState();

      // Enter fragment or skip it
      addTransition(start, fragment.start, "ε");
      addTransition(start, end, "ε");

      // Exit fragment
      addTransition(fragment.end, end, "ε");

      stack.push({ start, end });
    }
  }

  // ----------------------------------
  // VALIDATE FINAL STACK
  // ----------------------------------
  if (stack.length !== 1) {
    throw new Error("Invalid regular expression.");
  }

  const result = stack.pop();

  // ----------------------------------
  // BUILD ALPHABET
  // ----------------------------------
  const alphabet = [
    ...new Set(
      transitions
        .filter((transition) => transition.symbol !== "ε")
        .map((transition) => transition.symbol)
    ),
  ];

  // ----------------------------------
  // RETURN NFA
  // ----------------------------------
  return {
    states: Array.from(
      { length: stateCount },
      (_, index) => index
    ),

    alphabet,
    transitions,

    startState: result.start,
    acceptState: result.end,
  };
}