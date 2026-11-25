// Regex2Automata - Regular Expression to Postfix Converter

// Operators:
// |  Union (OR)
// .  Concatenation (we insert this automatically)
// *  Zero or more
// +  One or more
// ?  Optional
// ( ) Grouping

const precedence = {
  "|": 1,
  ".": 2,
};

function isOperator(char) {
  return ["|", ".", "*", "+", "?"].includes(char);
}

function isUnary(char) {
  return ["*", "+", "?"].includes(char);
}

// Insert explicit concatenation dots
export function addConcatenation(regex) {
  const chars = [...regex];
  let result = "";

  for (let i = 0; i < chars.length; i++) {
    const current = chars[i];
    const next = chars[i + 1];

    result += current;

    if (!next) continue;

    const currentCanEnd =
      current !== "(" && !["|"].includes(current);

    const nextCanStart =
      next !== ")" && !["|", "*", "+", "?"].includes(next);

    if (currentCanEnd && nextCanStart) {
      result += ".";
    }
  }

  return result;
}

// Convert infix regex to postfix notation
export function regexToPostfix(regex) {
  if (!regex || !regex.trim()) {
    throw new Error("Please enter a regular expression.");
  }

  regex = regex.replace(/\s/g, "");

  // Basic validation
  let balance = 0;

  for (const char of regex) {
    if (char === "(") balance++;
    if (char === ")") balance--;

    if (balance < 0) {
      throw new Error("Unmatched closing parenthesis.");
    }
  }

  if (balance !== 0) {
    throw new Error("Unmatched opening parenthesis.");
  }

  const explicit = addConcatenation(regex);
  const output = [];
  const stack = [];

  for (const char of explicit) {
    if (char === "(") {
      stack.push(char);
    } else if (char === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop());
      }

      if (!stack.length) {
        throw new Error("Invalid parentheses.");
      }

      stack.pop();
    } else if (isOperator(char)) {
      if (isUnary(char)) {
        output.push(char);
      } else {
        while (
          stack.length &&
          stack[stack.length - 1] !== "(" &&
          precedence[stack[stack.length - 1]] >= precedence[char]
        ) {
          output.push(stack.pop());
        }

        stack.push(char);
      }
    } else {
      output.push(char);
    }
  }

  while (stack.length) {
    const op = stack.pop();

    if (op === "(" || op === ")") {
      throw new Error("Invalid parentheses.");
    }

    output.push(op);
  }

  return output.join("");
}