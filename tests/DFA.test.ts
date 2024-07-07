import { DFA } from '../src/DFA'
import { NDFA, NDFAState, epsilonTransition } from '../src/NDFA'

describe("DFA", () => {
  it("DFA Recognize", () => {
    let astarbbstar = new DFA(2); // abb*
    astarbbstar.addTransition(0, "a", 0);
    astarbbstar.addTransition(0, "b", 1);
    astarbbstar.addTransition(1, "b", 1);
    astarbbstar.initialState = 0;
    astarbbstar.finalStates = [1];

    // Some words that should be recognized
    expect(astarbbstar.isRecognized("ab")).toBeTruthy();
    expect(astarbbstar.isRecognized("aab")).toBeTruthy();
    expect(astarbbstar.isRecognized("b")).toBeTruthy();
    expect(astarbbstar.isRecognized("bb")).toBeTruthy();
    expect(astarbbstar.isRecognized("aab")).toBeTruthy();
    expect(astarbbstar.isRecognized("abb")).toBeTruthy();
    expect(astarbbstar.isRecognized("aabb")).toBeTruthy();

    // Some words that shouldn't be recognized
    expect(astarbbstar.isRecognized("a")).toBeFalsy();
    expect(astarbbstar.isRecognized("aba")).toBeFalsy();
    expect(astarbbstar.isRecognized("abab")).toBeFalsy();

    // Some edge cases
    expect(astarbbstar.isRecognized("")).toBeFalsy();
    expect(astarbbstar.isRecognized("c")).toBeFalsy();
  });

  it("DFA recognizeEmpty", () => {
    // TODO
  });

  it("NDFA to DFA", () => {
    // TODO
  });

  it("DFA Product", () => {
    // TODO
  });

  it("DFA isLanguageIncluded", () => {
    let astar = NDFA.Thompson("a*").toDFA();
    let bstar = NDFA.Thompson("b*").toDFA();
    let abstar = NDFA.Thompson("ab*").toDFA();
    let astarbstar = NDFA.Thompson("a*b*").toDFA();
    let astarorbstar = NDFA.Thompson("a*|b*").toDFA();

    expect(DFA.isLanguageIncluded(astar, bstar)).toBeFalsy();
    expect(DFA.isLanguageIncluded(astar, astarbstar)).toBeTruthy();
    expect(DFA.isLanguageIncluded(bstar, astarbstar)).toBeTruthy();
    expect(DFA.isLanguageIncluded(abstar, astarbstar)).toBeTruthy();
    expect(DFA.isLanguageIncluded(astarbstar, astar)).toBeFalsy();
    expect(DFA.isLanguageIncluded(astarbstar, bstar)).toBeFalsy();
    expect(DFA.isLanguageIncluded(astarorbstar, astarbstar)).toBeTruthy();
    expect(DFA.isLanguageIncluded(astar, abstar)).toBeFalsy();
    expect(DFA.isLanguageIncluded(bstar, abstar)).toBeFalsy();

    let astarbstarNDFA = new NDFA(2);
    astarbstarNDFA.addTransition(0, "a", 0);
    astarbstarNDFA.addTransition(0, epsilonTransition, 1);
    astarbstarNDFA.addTransition(1, "b", 1);
    astarbstarNDFA.finalStates = NDFAState.fromBoolArray([false, true]);

    expect(DFA.areLanguageEqual(astarbstar, astarbstarNDFA.toDFA())).toBeTruthy();

  })
})
