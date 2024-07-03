import { assert } from "console";

/*
  NDFAState allows to store the state of a Non Deterministic Finite Automata. Technically it is a bit set
  which is implemented with a Uint32Array. 
*/
export class NDFAState {

  constructor(stateCount: number) {
    this.numberOfStates = stateCount;
    this.bitField = new Uint32Array(Math.ceil(stateCount/8));
  }

  static fromBoolArray(states: boolean[]) :NDFAState {
    let s = new NDFAState(states.length);
    states.forEach((v, i) => {
      if (v) {
        s.addState(i)
      }
    });
    return s;
  }

  static copy(origin: NDFAState) :NDFAState {
    let s = new NDFAState(origin.numberOfStates);
    for (let i = 0; i < origin.bitField.length; i++) {
      s.bitField[i] = origin.bitField[i];
    }
    return s;
  }

  resize(newSize: number): void {
    let newbitField = new Uint32Array(newSize);
    newbitField.set(this.bitField);
    this.bitField = newbitField;
  }

  union(rhs: NDFAState): void {
    for (let i = 0; i < rhs.bitField.length; i++) {
      this.bitField[i] |= rhs.bitField[i];
    }
  }

  intersect(rhs: NDFAState): void {
    for (let i = 0; i < rhs.bitField.length; i++) {
      this.bitField[i] &= rhs.bitField[i];
    }
  }

  contains(state: number): boolean {
    return ((this.bitField[Math.floor(state/32)] >> (state%32))&1) == 1;
  }

  addState(state: number): void {
    this.bitField[Math.floor(state/32)] |= (1 << (state%32));
  }

  removeState(state: number): void {
    this.bitField[Math.floor(state/32)] &= ~(1 << (state%32));
  }

  foreach(callBack: (state: number) => void): void {
    for(let i = 0; i < this.numberOfStates; i++) {
      if (this.contains(i)) {
        callBack(i);
      }
    }
  }

  stringify(): string {
    let out = "{";
    this.foreach((i) => {
      out+=`${i}, `
    })
    return out + "}";
  }

  isEmpty(): boolean {
    for (let i = 0; i < this.numberOfStates; i++) {
      if (this.contains(i)) {
        return false;
      }
    }
    return true;
  }

  protected bitField: Uint32Array;
  protected numberOfStates: number;
}

export const epsilonTransition: string = "epsilon"; // Todo : search if it would be possible to use symbol
type NDFATransitionSymbol = typeof epsilonTransition | string;

export class NDFA {
  constructor(stateCount: number) {
    this.finalStates = new NDFAState(stateCount);
    this.initialState = 0;
    this.deltaTable = Array(stateCount); // /!\ Can't use fill because of copy by reference
    for (let i = 0; i < stateCount; i++) {
      this.deltaTable[i] = {} as Record<NDFATransitionSymbol, NDFAState | never>;
    }
  }

  addTransition(originState: number, symbolRead: NDFATransitionSymbol, destinationState: number): void {
    assert(originState <= this.deltaTable.length, "originState is out of bounds");
    assert(destinationState <= this.deltaTable.length, "destinationState is out of bounds");
    if(!Object.keys(this.deltaTable[originState]).includes(String(symbolRead))) {
      this.deltaTable[originState][symbolRead] = new NDFAState(this.deltaTable.length);
    }
    this.deltaTable[originState][symbolRead].addState(destinationState);
  }

  generateDot(): string {
    let out: string = "digraph out {\n";

    out += "rankdir=LR;\n"; // graph from left to right

    // Double circle final states
    out += "node [shape = doublecircle];"
    this.finalStates.foreach((i) => {
      out += ` ${i}`
    })

    // Add an arrow before initial state
    out += ";\nnode [shape = point ]; qi"
    out += "\nnode [shape = circle];\n"
    out += `qi -> ${this.initialState};\n`


    // Add transition
    this.deltaTable.forEach((d, origin) => {
      for (let [symbol, destinations] of Object.entries(d)) {
        destinations.foreach((d) => {
          if (symbol === epsilonTransition) {
            symbol = "ε"
          }
          out += `${origin} -> ${d} [label = "${symbol}"];\n`
        })
      }
    })


    out += "}"
    return out;
  }

  delta(state: NDFAState, c: string): NDFAState {
    // List all the accessible states only reading epsilon
    let closureOfState = this.computeEpsilonClosure(state);

    // Read an epsilon from all these position
    let statesAfterReadingc = new NDFAState(this.deltaTable.length);
    closureOfState.foreach((i) => {
      if (Object.keys(this.deltaTable[i]).includes(c)) {
        statesAfterReadingc.union(this.deltaTable[i][c]);
      }
    })

    // List all the accessible states reading epsilon from statesAfterReadingc
    let result = this.computeEpsilonClosure(statesAfterReadingc);

    return result;
  }

  isRecognized(input: string): boolean {
    let s = new NDFAState(this.deltaTable.length);
    s.addState(this.initialState);
    for (const c of input) {
      s = this.delta(s, c);
      // If the char chan't be read, the word isn't recognized
      if (s.isEmpty()) {
        return false;
      }
    }

    // For empty word we should add epsilon closure to the initial state
    if (input === "") {
      s = this.computeEpsilonClosure(s);
    }

    // Check if we have one of the final states after reading input
    s.intersect(this.finalStates);
    return !s.isEmpty();
  }

  // A DFS of the labeled graph, the callBack return the next possible explored state
  private dfs(from: number, callBack: (at: number) => number[]) {
    let visited = new NDFAState(this.deltaTable.length);
    let toVisit = [from];

    while (toVisit.length != 0) {
      let at = toVisit[0];
      toVisit = toVisit.slice(1);
      if (visited.contains(at)) {
        continue;
      }
      visited.addState(at);
      toVisit = callBack(at).concat(toVisit);
    }
  }

  private computeEpsilonClosure(state: NDFAState): NDFAState {
    let closure = new NDFAState(this.deltaTable.length);
    state.foreach((s) => {
      this.dfs(s, (i) => {
        closure.addState(i);
        let next: number[] = [];
        if (Object.keys(this.deltaTable[i]).includes(String(epsilonTransition))) {
          this.deltaTable[i][epsilonTransition].foreach((j) => {
            next.push(j);
          })
        }
        return next;
      })
    })
    return closure;
  }

  initialState: number;
  finalStates: NDFAState;
  protected deltaTable: (Record<NDFATransitionSymbol, NDFAState | never>)[];
}

