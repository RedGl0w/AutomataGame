import { Regex, RegexNodeType } from '../src/regex'

describe("Regex", () => {

  let a = new Regex(RegexNodeType.Concat, 
    [
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
    ]  
  );

  it("stringify", () => {
    expect(a.stringify()).toBe("((a|b|ε)∅)*c");
  })
})
