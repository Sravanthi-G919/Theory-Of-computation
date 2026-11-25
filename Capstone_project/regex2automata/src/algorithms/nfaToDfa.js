/*
  Regex2Automata
  NFA to DFA - Subset Construction Algorithm
*/

export function convertNFAtoDFA(nfa) {
  const {
    transitions,
    alphabet,
    startState,
    acceptState,
  } = nfa;

  // =========================================
  // 1. EPSILON CLOSURE
  // Find all states reachable without reading
  // an input character.
  // =========================================
  function epsilonClosure(stateSet) {
    const visited = new Set(stateSet);
    const stack = [...stateSet];

    while (stack.length > 0) {
      const current = stack.pop();

      for (const transition of transitions) {
        if (
          transition.from === current &&
          transition.symbol === "ε" &&
          !visited.has(transition.to)
        ) {
          visited.add(transition.to);
          stack.push(transition.to);
        }
      }
    }

    return [...visited].sort((a, b) => a - b);
  }

  // =========================================
  // 2. MOVE
  // Find states reachable using a given symbol.
  // =========================================
  function move(stateSet, symbol) {
    const result = new Set();

    for (const current of stateSet) {
      for (const transition of transitions) {
        if (
          transition.from === current &&
          transition.symbol === symbol
        ) {
          result.add(transition.to);
        }
      }
    }

    return [...result].sort((a, b) => a - b);
  }

  // =========================================
  // 3. SUBSET KEY
  // Give each NFA state set a unique key.
  // =========================================
  function setKey(stateSet) {
    return [...stateSet]
      .sort((a, b) => a - b)
      .join(",");
  }

  // =========================================
  // 4. DFA STORAGE
  // =========================================
  const dfaStates = [];
  const dfaTransitions = [];
  const dfaAcceptStates = [];

  const discovered = new Map();
  const queue = [];

  // =========================================
  // 5. INITIAL DFA STATE
  // =========================================
  const initialSet = epsilonClosure([startState]);
  const initialKey = setKey(initialSet);

  discovered.set(initialKey, "D0");

  dfaStates.push({
    id: "D0",
    nfaStates: initialSet,
  });

  queue.push(initialSet);

  // =========================================
  // 6. SUBSET CONSTRUCTION
  // =========================================
  while (queue.length > 0) {
    const currentSet = queue.shift();

    const currentKey = setKey(currentSet);
    const currentId = discovered.get(currentKey);

    // ---------------------------------------
    // Check whether the DFA state is accepting
    // ---------------------------------------
    if (currentSet.includes(acceptState)) {
      if (!dfaAcceptStates.includes(currentId)) {
        dfaAcceptStates.push(currentId);
      }
    }

    // ---------------------------------------
    // Process every alphabet symbol
    // ---------------------------------------
    for (const symbol of alphabet) {
      // Move on the input symbol
      const reachedStates = move(currentSet, symbol);

      // Include all epsilon-reachable states
      const nextSet = epsilonClosure(reachedStates);

      const nextKey = setKey(nextSet);

      // -------------------------------------
      // Create a new DFA state if necessary
      // -------------------------------------
      if (!discovered.has(nextKey)) {
        const nextId = `D${discovered.size}`;

        discovered.set(nextKey, nextId);

        dfaStates.push({
          id: nextId,
          nfaStates: nextSet,
        });

        queue.push(nextSet);
      }

      const nextId = discovered.get(nextKey);

      // -------------------------------------
      // Add DFA transition
      // -------------------------------------
      dfaTransitions.push({
        from: currentId,
        to: nextId,
        symbol,
      });
    }
  }

  // =========================================
  // 7. RETURN DFA
  // =========================================
  return {
    states: dfaStates,
    alphabet: [...alphabet],
    transitions: dfaTransitions,
    startState: "D0",
    acceptStates: dfaAcceptStates,
  };
}