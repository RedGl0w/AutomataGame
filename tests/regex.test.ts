import { Regex, RegexNodeType } from '../src/regex'
import { NDFA } from '../src/NDFA'
import { DFA } from '../src/DFA'

describe("Regex", () => {

  it("stringify", () => {
    let a = new Regex(RegexNodeType.Concat, [
      new Regex(RegexNodeType.Star, 
        new Regex(RegexNodeType.Concat, [
          new Regex(RegexNodeType.Union,[
            new Regex(RegexNodeType.Char, "a"),
            new Regex(RegexNodeType.Union, [
              new Regex(RegexNodeType.Char, "b"),
              new Regex(RegexNodeType.Epsilon)
            ])
          ]),
          new Regex(RegexNodeType.Empty)
        ])
      ),
      new Regex(RegexNodeType.Char, "c")
    ]);
    expect(a.stringify()).toBe("((a|b|ε)∅)*c");
  });

  it("parse", () => {
    function checkIfParsedAndStringifiedEqual(s: string) {
      expect(Regex.parse(s).stringify()).toBe(s);
    }

    // TODO : Add error parsing tests
    checkIfParsedAndStringifiedEqual("a");
    checkIfParsedAndStringifiedEqual("ε");
    checkIfParsedAndStringifiedEqual("∅");
    checkIfParsedAndStringifiedEqual("ab");
    checkIfParsedAndStringifiedEqual("a*");
    checkIfParsedAndStringifiedEqual("a|b");
    checkIfParsedAndStringifiedEqual("(ab)*");
    checkIfParsedAndStringifiedEqual("ε|a*b");
    checkIfParsedAndStringifiedEqual("(0|(1(01*(00)*0)*1)*)*");
  });

  it("isEmpty", () => {
    function testIsEmpty(s: string, v: boolean) {
      expect(Regex.parse(s).isEmpty()).toStrictEqual(v);
    }

    testIsEmpty("∅a|∅", true);
    testIsEmpty("(∅)*a", true);
    testIsEmpty("∅|ε", false);
    testIsEmpty("a*", false);
  });

  it("containsEpsilon", () => {
    function testContainsEpsilon(s: string, v: boolean) {
      expect(Regex.parse(s).containsEpsilon()).toStrictEqual(v);
    }

    testContainsEpsilon("∅a|b", false);
    testContainsEpsilon("(∅)*a", false);
    testContainsEpsilon("∅|ε", true);
    testContainsEpsilon("a*", true);
    testContainsEpsilon("εa*", true);
  });

  it("Local Language Sets", () => {
    let e = Regex.parse("a*(ab)*|aa");
    expect(e.computeP()).toStrictEqual(["a"]);
    expect(e.computeD()).toStrictEqual(["a", "b"]);
    expect(e.computeF()).toStrictEqual(["aa", "ab", "ba"]);
  });

  it("Linearize", () => {
    let e = Regex.parse("(aabb|c*)ε");
    let a1 = NDFA.Thompson(e).toDFA();
    let [lineazized, table] = e.linearize();
    let a2 = NDFA.Thompson(lineazized);
    expect(DFA.areLanguageEqual(a1, a2.toDFA())).toBeFalsy();
    a2.unLinearize(table);
    expect(DFA.areLanguageEqual(a1, a2.toDFA())).toBeTruthy();
  })
})
