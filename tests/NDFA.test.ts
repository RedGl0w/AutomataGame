import { NDFA, NDFAState, epsilonTransition } from "../src/NDFA";
import { Regex, RegexNodeType } from "../src/regex";

describe("NDFAState", () => {
  // TODO Add tests
})

describe("NDFA", () => {
  let astarbstar = new NDFA(2);
  astarbstar.addTransition(0, "a", 0);
  astarbstar.addTransition(0, epsilonTransition, 1);
  astarbstar.addTransition(1, "b", 1);
  astarbstar.finalStates = NDFAState.fromBoolArray([false, true]);

  it("Recognize", () => {
    // Some words that should be recognized
    expect(astarbstar.isRecognized("a")).toBeTruthy();
    expect(astarbstar.isRecognized("aa")).toBeTruthy();
    expect(astarbstar.isRecognized("b")).toBeTruthy();
    expect(astarbstar.isRecognized("bb")).toBeTruthy();
    expect(astarbstar.isRecognized("aab")).toBeTruthy();
    expect(astarbstar.isRecognized("abb")).toBeTruthy();
    expect(astarbstar.isRecognized("aabb")).toBeTruthy();

    // Some words that shouldn't be recognized
    expect(astarbstar.isRecognized("aba")).toBeFalsy();
    expect(astarbstar.isRecognized("abab")).toBeFalsy();
    
    // Edge case : epsilon and letters that aren't in the alphabet
    expect(astarbstar.isRecognized("")).toBeTruthy();
    expect(astarbstar.isRecognized("c")).toBeFalsy();
  });

  it("recognizeEmpty", () => {
    expect(astarbstar.recognizeEmpty()).toBeFalsy();
  });

  it("Thompson", () => {
    // exp = a*c|ε
    let exp = new Regex(RegexNodeType.Union, [
      new Regex(RegexNodeType.Concat, [
        new Regex(RegexNodeType.Star, new Regex(RegexNodeType.Char, "a")),
        new Regex(RegexNodeType.Char, "c")
      ]),
      new Regex(RegexNodeType.Epsilon)
    ]);

    let expThompson = NDFA.Thompson(exp);
    expect(expThompson.isRecognized("aaac")).toBeTruthy();
    expect(expThompson.isRecognized("c")).toBeTruthy();
    expect(expThompson.isRecognized("")).toBeTruthy();
    expect(expThompson.isRecognized("aaa")).toBeFalsy();
    expect(expThompson.isRecognized("aca")).toBeFalsy();
  });
});
