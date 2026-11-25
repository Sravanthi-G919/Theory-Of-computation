
import { regexToPostfix } from "./regexToPostfix.js";
import { buildNFA } from "./thompsonNFA.js";
import { convertNFAtoDFA } from "./nfaToDfa.js";

const patterns = [
  "a",
  "ab",
  "a|b",
  "a*",
  "(a|b)*abb",
];

for (const regex of patterns) {
  try {
    const postfix = regexToPostfix(regex);
    const nfa = buildNFA(postfix);
    const dfa = convertNFAtoDFA(nfa);

    console.log("\n========================");
    console.log("Regex:", regex);
    console.log("Postfix:", postfix);

    console.log("\nDFA States:");
    console.log(dfa.states);

    console.log("\nDFA Start State:");
    console.log(dfa.startState);

    console.log("\nDFA Accept States:");
    console.log(dfa.acceptStates);

    console.log("\nDFA Transitions:");
    console.log(dfa.transitions);
  } catch (error) {
    console.error(`Error in ${regex}:`, error.message);
  }
}
