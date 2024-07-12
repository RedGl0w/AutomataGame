import assert from "assert";
import { Regex } from "./regex"

export class DFA {
  constructor(stateCount: number) {
    this.initialState = 0;
    this.finalStates = [];
    this.deltaTable = Array(stateCount); // /!\ Can't use fill because of copy by reference
    for (let i = 0; i < stateCount; i++) {
      this.deltaTable[i] = {} as Record<string, number | never>;
    }
  }

  static copy(a: DFA): DFA {
    let result = new DFA(a.numberOfStates());
    result.initialState = a.initialState;
    result.finalStates = [...a.finalStates];
    result.deltaTable.forEach((_, i) => {
      result.deltaTable[i] = {... a.deltaTable[i]};
    })
    return result;
  }

  numberOfStates(): number {
    return this.deltaTable.length;
  }

  addState(): void {
    this.deltaTable.push({});
  }

  addTransition(originState: number, symbolRead: string, destinationState: number): void {
    assert(originState <= this.numberOfStates(), "originState is out of bounds");
    assert(destinationState <= this.numberOfStates(), "destinationState is out of bounds");
    this.deltaTable[originState][symbolRead] = destinationState;
  }

  delta(originState: number, symbolRead: string): number {
    if (Object.keys(this.deltaTable[originState]).includes(symbolRead)) {
      return this.deltaTable[originState][symbolRead];
    }
    return -1; // -1 = automata blocked
  }

  isRecognized(input: string): boolean {
    let s: number = this.initialState;
    while (s != -1 && input != "") {
      s = this.delta(s, input[0]);
      input = input.substring(1);
    }
    if (s != -1) {
      return this.finalStates.includes(s);
    }
    return false;
  }

  // TODO Find a way to test the generateDot members
  /* istanbul ignore next */
  generateDot(): string {
    let out: string = "digraph out {\n";

    out += "rankdir=LR;\n"; // graph from left to right

    // Double circle final states
    out += "node [shape = doublecircle];"
    this.finalStates.forEach((i) => {
      out += ` ${i}`
    })

    // Add an arrow before initial state
    out += ";\nnode [shape = point ]; qi"
    out += "\nnode [shape = circle];\n"
    out += `qi -> ${this.initialState};\n`


    // Add transition
    this.deltaTable.forEach((d, origin) => {
      for (let [symbol, destination] of Object.entries(d)) {
        out += `${origin} -> ${destination} [label = "${symbol}"];\n`
      }
    })

    out += "}"
    return out;
  }

  // Automata which recognize the intersection of the recognized languages
  static product(a1: DFA, a2: DFA): DFA {
    const a1size = a1.numberOfStates();
    const a2size = a2.numberOfStates();
    let result = new DFA(a1size * a2size);

    const directConversion = (i: number, j: number) => {
      return i*a2size+j;
    }

    result.initialState = directConversion(a1.initialState, a2.initialState);
    a1.finalStates.forEach((i) => {
      a2.finalStates.forEach((j) => {
        result.finalStates.push(directConversion(i, j));
      });
    });

    for(let origin1 = 0; origin1 < a1size; origin1++) {
      for (let origin2 = 0; origin2 < a2size; origin2++) {
        for (const [symbol, destination1] of Object.entries(a1.deltaTable[origin1])) {
          if (Object.keys(a2.deltaTable[origin2]).includes(symbol)) {
            let destination2 = a2.deltaTable[origin2][symbol];
            result.addTransition(directConversion(origin1, origin2), symbol, directConversion(destination1, destination2));
          }
        }
      }
    }

    return result;
  }

  private getAlphabet(): string[] {
    let n: number = this.numberOfStates();

    let symbols: string[] = [];
    let visited: boolean[] = Array(n).fill(false);

    while (visited.includes(false)) {
      for (let firstState = 0; firstState < n; firstState++) {
        if (!visited[firstState]) {
          this.dfs(firstState, (o) => {
            let next: number[] = [];
            for (const [s, d] of Object.entries(this.deltaTable[o])) {
              if (!symbols.includes(s)) {
                symbols.push(s);
              }
              if (!visited[d]) {
                next.push(d);
              }
            }
            return next;
          }).forEach((i) => {
            visited[i] = true;
          });
        }
      }
    }
    return symbols;
  }

  makeComplete(alphabet: string[] | undefined = undefined): void {
    if (alphabet == undefined) {
      alphabet = this.getAlphabet();
    }

    // We will use a new state called well to redirect previously missing transition
    this.addState();
    let n = this.numberOfStates();
    let well = n-1;

    for (let i = 0; i < n; i++) {
      alphabet.forEach((s) => {
        if (!Object.keys(this.deltaTable[i]).includes(s)) {
          this.addTransition(i, s, well);
        }
      });
    }
  }

  // Compute the automata which recognize its complementary language
  makeComplementary(): void {
    // We should assert that the automata is complete
    let newFinalStates: number[] = [];
    let n = this.numberOfStates();

    for (let i = 0; i < n; i++) {
      if (!this.finalStates.includes(i)) {
        newFinalStates.push(i);
      }
    }

    this.finalStates = newFinalStates;
  }

  private static union(a: string[], b: string[]): string[] {
    let result = [... a];
    b.forEach((v) => {
      if (!result.includes(v)) {
        result.push(v);
      }
    });
    return result;
  }

  recognizeEmpty(): boolean {
    let accessible = this.dfs(this.initialState, (i) => {
      let next: number[] = [];
      for (const [symbol, destination] of Object.entries(this.deltaTable[i])) {
        next.push(destination);
      }
      return next;
    });
    let isEmpty = true;
    accessible.forEach((s) => {
      if (this.finalStates.includes(s)) {
        isEmpty = false;
      }
    })
    return isEmpty;
  }

  // L(a) ⊆ L(b) ⇔ L(a) ∩ (L(B)ᶜ)
  static isLanguageIncluded(a: DFA, b: DFA): boolean {
    let aAlphabet = a.getAlphabet();
    let bAlphabet = b.getAlphabet();
    let alphabet = this.union(aAlphabet, bAlphabet);

    let aComplete = DFA.copy(a);
    aComplete.makeComplete(alphabet);
    let bComplementary = DFA.copy(b);
    bComplementary.makeComplete(alphabet);
    bComplementary.makeComplementary();

    let prod = DFA.product(aComplete, bComplementary);
    return prod.recognizeEmpty();
  }

  static areLanguageEqual(a: DFA, b: DFA): boolean {
    return this.isLanguageIncluded(a, b) && this.isLanguageIncluded(b, a);
  }



  private dfs(firstState: number, callBack: (at: number) => number[]): number[] {
    let visited: number[] = [];
    let toVisit = [firstState];
    while (toVisit.length != 0) {
      let at = toVisit[0];
      toVisit = toVisit.slice(1);
      if (visited.includes(at)) {
        continue;
      }
      visited.push(at);
      toVisit = callBack(at).concat(toVisit);
    }
    return visited;
  }

  initialState: number;
  finalStates: number[];
  protected deltaTable: (Record<string, number | never>)[];
}
