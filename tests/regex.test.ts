import { Regex, RegexNodeType } from '../src/regex'

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
})
