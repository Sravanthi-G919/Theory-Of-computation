
import { regexToPostfix } from "./regexToPostfix.js";
import { buildNFA } from "./thompsonNFA.js";

const patterns = [
  "a",
  "ab",
  "a|b",
  "a*",
  "a(b|c)*",
  "(a|b)*abb",
];

for (const regex of patterns) {
  try {
    const postfix = regexToPostfix(regex);
    const nfa = buildNFA(postfix);

    console.log("\nRegex:", regex);
    console.log("Postfix:", postfix);
    console.log("States:", nfa.states);
    console.log("Start:", nfa.startState);
    console.log("Accept:", nfa.acceptState);
    console.log("Transitions:", nfa.transitions);
    console.log("Alphabet:", nfa.alphabet);
    console.log("========================");
  } catch (error) {
    console.error(`Error in ${regex}:`, error.message);
  }
}
