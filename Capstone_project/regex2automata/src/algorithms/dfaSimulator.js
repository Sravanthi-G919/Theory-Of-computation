/*
  Regex2Automata
  DFA Step-by-Step Simulator
*/

export function createSimulation(dfa, input) {
  const steps = [];
  let currentState = dfa.startState;

  const isAccepting = (stateId) =>
    (dfa.acceptStates || []).some(
      (acceptState) => String(acceptState) === String(stateId)
    );

  // Initial step — before reading any input.
  steps.push({
    step: 0,
    state: currentState,
    character: null,
    position: 0,
    status: 'ready',
    message: `Start at ${currentState}.`,
  });

  // Process each character of the input.
  for (let i = 0; i < input.length; i++) {
    const character = input[i];

    const transition = dfa.transitions.find(
      (t) =>
        String(t.from) === String(currentState) &&
        String(t.symbol) === String(character)
    );

    // No transition: the automaton is stuck at its current state.
    if (!transition) {
      const stuckState = currentState;

      steps.push({
        step: i + 1,
        state: stuckState,
        character,
        position: i + 1,
        status: 'stuck',
        message:
          `No transition from ${stuckState} for '${character}'. ` +
          `The automaton is stuck here.`,
        failedCharacter: character,
        failedPosition: i + 1,
      });

      return {
        steps,
        accepted: false,
        reasonCode: 'NO_TRANSITION',
        reason:
          `Rejected: no transition from ${stuckState} for '${character}'.`,
        finalState: stuckState,
        stuckState,
        failedCharacter: character,
        failedPosition: i + 1,
      };
    }

    // A valid transition exists. Move forward.
    const previousState = currentState;
    currentState = transition.to;

    steps.push({
      step: i + 1,
      state: currentState,
      character,
      position: i + 1,
      status: 'running',

      transition: {
        from: previousState,
        to: currentState,
        symbol: character,
      },

      message: `Read '${character}': moved from ${previousState} to ${currentState}.`,
    });
  }

  // All characters have been read. Check the final state.
  const accepted = isAccepting(currentState);
  const finalStatus = accepted ? 'accepted' : 'rejected';

  const lastStep = steps[steps.length - 1];

  lastStep.status = finalStatus;
  lastStep.message = accepted
    ? `Input finished at ${currentState}. This is an accepting state.`
    : `Input finished at ${currentState}. This is not an accepting state.`;

  return {
    steps,
    accepted,
    reasonCode: accepted
      ? 'ACCEPTED'
      : 'NON_ACCEPTING_FINAL_STATE',

    reason: accepted
      ? `Accepted. Final state ${currentState} is accepting.`
      : `Rejected. Final state ${currentState} is not accepting.`,

    finalState: currentState,
  };
}