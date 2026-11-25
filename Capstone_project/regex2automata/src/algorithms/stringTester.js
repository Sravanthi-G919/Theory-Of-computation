/*
  Regex2Automata
  DFA String Acceptance Tester
*/

// Check whether the input string is accepted by the generated DFA.
export function testDFAString(dfa, input) {
  let currentState = dfa.startState;
  const path = [currentState];

  for (let i = 0; i < input.length; i++) {
    const character = input[i];

    const transition = dfa.transitions.find(
      (t) =>
        String(t.from) === String(currentState) &&
        String(t.symbol) === String(character)
    );

    // No transition exists for this input character.
    if (!transition) {
      return {
        accepted: false,
        reasonCode: 'NO_TRANSITION',
        reason: `No transition exists from ${currentState} for input '${character}'.`,
        finalState: currentState,
        stuckState: currentState,
        failedCharacter: character,
        failedPosition: i + 1,
        path,
      };
    }

    // Move to the next state.
    currentState = transition.to;
    path.push(currentState);
  }

  // Check whether the final state is accepting.
  const accepted = (dfa.acceptStates || []).some(
    (state) => String(state) === String(currentState)
  );

  return {
    accepted,
    reasonCode: accepted
      ? 'ACCEPTED'
      : 'NON_ACCEPTING_FINAL_STATE',

    reason: accepted
      ? `Accepted. Input ended at accepting state ${currentState}.`
      : `Rejected. Input ended at ${currentState}, which is not an accepting state.`,

    finalState: currentState,
    path,
  };
}