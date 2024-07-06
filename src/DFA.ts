import assert from "assert";

export class DFA {
  constructor(stateCount: number) {
    this.initialState = 0;
    this.finalStates = [];
    this.deltaTable = Array(stateCount); // /!\ Can't use fill because of copy by reference
    for (let i = 0; i < stateCount; i++) {
      this.deltaTable[i] = {} as Record<string, number | never>;
    }
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

  initialState: number;
  finalStates: number[];
  protected deltaTable: (Record<string, number | never>)[];
}
