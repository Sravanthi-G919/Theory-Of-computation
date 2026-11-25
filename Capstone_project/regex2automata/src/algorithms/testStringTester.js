
import { regexToPostfix } from "./regexToPostfix.js";
import { buildNFA } from "./thompsonNFA.js";
import { convertNFAtoDFA } from "./nfaToDfa.js";
import { testDFAString } from "./stringTester.js";

const regex = "(a|b)*abb";

const postfix = regexToPostfix(regex);
const nfa = buildNFA(postfix);
const dfa = convertNFAtoDFA(nfa);

const testStrings = [
  "abb",
  "aabb",
  "babb",
  "aaabb",
  "ab",
  "aba",
  "bbb",
  "a",
  "",
];

console.log("Regular Expression:", regex);
console.log("================================");

for (const input of testStrings) {
  const result = testDFAString(dfa, input);

  console.log(
    `Input: "${input}" => ${
      result.accepted ? "ACCEPTED ✅" : "REJECTED ❌"
    }`
  );

  console.log("Path:", result.path.join(" -> "));
  console.log("Reason:", result.reason);
  console.log("--------------------------------");
}
