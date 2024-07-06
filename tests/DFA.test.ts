import { DFA } from '../src/DFA'

describe("DFA", () => {
  it("Recognize", () => {
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

  })
})
