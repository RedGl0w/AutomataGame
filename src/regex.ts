import assert from "assert";

export enum RegexNodeType {
  Empty,
  Epsilon,
  Char,
  Union,
  Concat,
  Star
};

export class Regex {
  constructor(t: RegexNodeType, c: Regex | Regex[] | string | undefined = undefined) {
    this.nodeType = t;
    this.children = c;
  }

  stringify(aboveInTree: RegexNodeType | undefined = undefined): string {
    switch(this.nodeType) {
      case RegexNodeType.Empty:
        return "∅";
      case RegexNodeType.Epsilon:
        return "ε";
      case RegexNodeType.Char: {
        assert(typeof this.children == "string");
        return this.children as string;
      }
      case RegexNodeType.Union: {
        assert(Array.isArray(this.children));
        let childrenStringified = `${(this.children as Regex[]).map((v) => { return v.stringify(RegexNodeType.Union)}).join("|")}`;
        if (aboveInTree == RegexNodeType.Concat || aboveInTree == RegexNodeType.Star) {
          return `(${childrenStringified})`;
        }
        return childrenStringified;
      }
      case RegexNodeType.Concat: {
        assert(Array.isArray(this.children));
        let childrenStringified = `${(this.children as Regex[]).map((v) => { return v.stringify(RegexNodeType.Concat)}).join("")}`
        if (aboveInTree == RegexNodeType.Star) {
          return `(${childrenStringified})`;
        }
        return childrenStringified;
      }
      case RegexNodeType.Star: {
        assert(Regex.prototype.isPrototypeOf(this.children as Regex));
        return `${(this.children as Regex).stringify(RegexNodeType.Star)}*`
      }
    }
  }

  /*
  The grammar we will use to parse Regex is :
    R -> C | C "|" R          // Union
    C -> B | B C              // Concatenation
    B -> S {"*"} | "(" R ")"  //
    S -> string | ε | ∅       // Base case
  */

  private static parseR(s: string): [Regex, string] {
    let [parsedC, endingC] = this.parseC(s);

    if (endingC != "" && endingC[0] == "|") {
      let [parsedR, endingR] = this.parseR(endingC.substring(1));
      return [
        new Regex(RegexNodeType.Union, [parsedC, parsedR]),
        endingR
      ];
    }

    return [parsedC, endingC];
  }

  private static parseC(s: string): [Regex, string] {
    let [parsedB, endingB] = this.parseB(s);
    try {
      let [parsedC, endingC] = this.parseC(endingB);
      return [new Regex(RegexNodeType.Concat, [parsedB, parsedC]), endingC];
    } catch(e) {
      return [parsedB, endingB];
    }

  }

  private static parseB(s: string): [Regex, string] {
    if (s == "") {
      throw Error("Unexpected end of stream");
    }

    let c = s[0];
    if (c == "(") {
      let [parsedR, endingR] = this.parseR(s.substring(1));
      if (endingR == "") {
        throw Error("Unexpected end of stream");
      }
      if (endingR[0] != ")") {
        throw Error(`Unexpected ${endingR[0]} near ${endingR}`);
      }
      endingR = endingR.substring(1);
      while (endingR != "" && endingR[0] == "*") {
        parsedR = new Regex(RegexNodeType.Star, parsedR);
        endingR = endingR.substring(1);
      }
      return [parsedR, endingR];
    }

    let [parsedS, endingS] = this.parseS(s);
    while (endingS != "" && endingS[0] == "*") {
      parsedS = new Regex(RegexNodeType.Star, parsedS);
      endingS = endingS.substring(1);
    }
    return [parsedS, endingS];
  }

  private static parseS(s: string): [Regex, string] {
    if (s == "") {
      throw Error("Unexpected end of stream");
    }
    let c = s[0];
    let ending = s.substring(1);
    if (c == "ε") {
      let e = new Regex(RegexNodeType.Epsilon);
      return [e, ending];
    }
    if (c == "∅") {
      let e = new Regex(RegexNodeType.Empty);
      return [e, ending];
    }
    if (["|", "(", ")", "*"].includes(c)) {
      throw Error(`Unexpected symbol ${c} near ${s}`);
    }
    let e = new Regex(RegexNodeType.Char, c);
    return [e, ending];
  }

  static parse(s: string): Regex {
    let [parsedR, endingR] = this.parseR(s);
    if (endingR != "") {
      throw Error(`Unexpected ${endingR}`);
    }
    return parsedR;
  }

  nodeType: RegexNodeType;
  children: Regex | Regex[] | string | undefined;
}
