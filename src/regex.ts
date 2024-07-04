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

  nodeType: RegexNodeType;
  children: Regex | Regex[] | string | undefined;
}
