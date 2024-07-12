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

  isEmpty(): boolean {
    switch(this.nodeType) {
      case RegexNodeType.Empty:
        return true;
      case RegexNodeType.Epsilon:
        return false;
      case RegexNodeType.Char:
        return false;
      case RegexNodeType.Union: {
        for (const c of (this.children as Regex[])) {
          if (!c.isEmpty()) {
            return false;
          }
        }
        return true;
      }
      case RegexNodeType.Concat: {
        for (const c of (this.children as Regex[])) {
          if (c.isEmpty()) {
            return true;
          }
        }
        return false;
      }
      case RegexNodeType.Star: {
        return (this.children as Regex).isEmpty();
      }
    }
  }

  containsEpsilon(): boolean {
    switch(this.nodeType) {
      case RegexNodeType.Empty:
        return false;
      case RegexNodeType.Epsilon:
        return true;
      case RegexNodeType.Char:
        return false;
      case RegexNodeType.Union: {
        for (const c of (this.children as Regex[])) {
          if (c.containsEpsilon()) {
            return true;
          }
        }
        return false;
      }
      case RegexNodeType.Concat: {
        for (const c of (this.children as Regex[])) {
          if (!c.containsEpsilon()) {
            return false;
          }
        }
        return true;
      }
      case RegexNodeType.Star:
        return !(this.children as Regex).isEmpty();
    }
  }

  private static sortedUnion(l1: string[], l2: string[]): string[] {
    let r: string[] = [];
    while(l1.length != 0 && l2.length != 0) {
      if (l1[0] == l2[0]) {
        r.push(l1[0]);
        l1 = l1.slice(1);
        l2 = l2.slice(1);
      } else if (l1[0].localeCompare(l2[0]) == -1) {
        r.push(l1[0]);
        l1 = l1.slice(1);
      } else {
        r.push(l2[0]);
        l2 = l2.slice(1);
      }
    }
    r = r.concat(l1).concat(l2);
    return r;
  }

  // For all of these operation we consider the Regex to not contain ∅
  computeP(): string[] {
    switch (this.nodeType) {
      case RegexNodeType.Empty:
      case RegexNodeType.Epsilon:
        return [];
      case RegexNodeType.Char:
        return [this.children as string];
      case RegexNodeType.Union: {
        let result: string[] = [];
        for (const c of (this.children as Regex[])) {
          result = Regex.sortedUnion(result, c.computeP());
        }
        return result;
      }
      case RegexNodeType.Concat: {
        if ((this.children as Regex[])[0].containsEpsilon()) {
          return Regex.sortedUnion((this.children as Regex[])[0].computeP(), (this.children as Regex[])[1].computeP());
        }
        return (this.children as Regex[])[0].computeP();
      }
      case RegexNodeType.Star: {
        return (this.children as Regex).computeP();
      }
    }
  }

  computeD(): string[] {
    switch (this.nodeType) {
      case RegexNodeType.Empty:
      case RegexNodeType.Epsilon:
        return [];
      case RegexNodeType.Char:
        return [this.children as string];
      case RegexNodeType.Union: {
        let result: string[] = [];
        for (const c of (this.children as Regex[])) {
          result = Regex.sortedUnion(result, c.computeD());
        }
        return result;
      }
      case RegexNodeType.Concat: {
        if ((this.children as Regex[])[1].containsEpsilon()) {
          return Regex.sortedUnion((this.children as Regex[])[0].computeD(), (this.children as Regex[])[1].computeD());
        }
        return (this.children as Regex[])[1].computeD();
      }
      case RegexNodeType.Star: {
        return (this.children as Regex).computeD();
      }
    }
  }

  private static cartesianProductOfStringArray(l1: string[], l2: string[]): string[] {
    let result: string[] = [];
    l1.forEach((i) => {
      l2.forEach((j) => {
        result.push(i+j);
      });
    });
    return result;
  }

  computeF(): string[] {
    switch (this.nodeType) {
      case RegexNodeType.Empty:
      case RegexNodeType.Epsilon:
      case RegexNodeType.Char:
        return [];
      case RegexNodeType.Union: {
        let result: string[] = [];
        for (const c of (this.children as Regex[])) {
          result = Regex.sortedUnion(result, c.computeF());
        }
        return result;
      }
      case RegexNodeType.Concat: {
        let result: string[] = [];
        let d0 = (this.children as Regex[])[0].computeD();
        let p1 = (this.children as Regex[])[1].computeP();
        for (const c of (this.children as Regex[])) {
          result = Regex.sortedUnion(result, c.computeF());
        }
        result = Regex.sortedUnion(result, Regex.cartesianProductOfStringArray(d0, p1));
        return result;
      }
      case RegexNodeType.Star: {
        let result: string[] = (this.children as Regex).computeF();
        let d = (this.children as Regex).computeD();
        let p = (this.children as Regex).computeP();
        result = Regex.sortedUnion(result, Regex.cartesianProductOfStringArray(d, p));
        return result;
      }
    }
  }

  linearize(): [Regex, Record<string, string>] {
    let table: Record<string, string> = {};
    let [result, _] = this.privlinearize("a".charCodeAt(0), table);
    return [result, table];
  }

  private privlinearize(nextC: number, table: Record<string, string>): [Regex, number] {
    let result: Record<string, string> = {};
    switch (this.nodeType) {
      case RegexNodeType.Empty:
      case RegexNodeType.Epsilon:
        return [this, nextC];
      case RegexNodeType.Char: {
        let c = String.fromCharCode(nextC);
        table[c] = (this.children as string);
        return [
          new Regex(RegexNodeType.Char, c),
          nextC+1
        ];
      }
      case RegexNodeType.Union: {
        let [e1, nextCe1] = (this.children as Regex[])[0].privlinearize(nextC, table);
        let [e2, nextCe2] = (this.children as Regex[])[1].privlinearize(nextCe1, table);
        return [
          new Regex(RegexNodeType.Union, [e1, e2]),
          nextCe2
        ];
      }
      case RegexNodeType.Concat: {
        let [e1, nextCe1] = (this.children as Regex[])[0].privlinearize(nextC, table);
        let [e2, nextCe2] = (this.children as Regex[])[1].privlinearize(nextCe1, table);
        return [
          new Regex(RegexNodeType.Concat, [e1, e2]),
          nextCe2
        ];
      }
      case RegexNodeType.Star: {
        let [e1, nextCe1] = (this.children as Regex).privlinearize(nextC, table);
        return [
          new Regex(RegexNodeType.Star, e1),
          nextCe1
        ];
      }
    }
  }

  nodeType: RegexNodeType;
  children: Regex | Regex[] | string | undefined;
}
