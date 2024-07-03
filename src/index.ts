import { NDFA, NDFAState, epsilonTransition } from "./NDFA";

// Recognize a*b*
let test = new NDFA(2);
test.addTransition(0, "a", 0);
test.addTransition(0, epsilonTransition, 1);
test.addTransition(1, "b", 1);
test.finalStates = NDFAState.fromBoolArray([false, true]);
console.log(test.generateDot());

function testRecognized(s: string): void {
  console.log(`${s} : ${test.isRecognized(s)}`);
}

testRecognized("")
testRecognized("a")
testRecognized("ab")
testRecognized("aab")
testRecognized("abb")
testRecognized("aabb")
testRecognized("aba")
