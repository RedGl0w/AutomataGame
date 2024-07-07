import { assert } from "console";
import { Regex, RegexNodeType } from "./regex";
import { DFA } from "./DFA";

/*
  NDFAState allows to store the state of a Non Deterministic Finite Automata. Technically it is a bit set
  which is implemented with a BigInt. 
*/
export class NDFAState {

  constructor(stateCount: number) {
    this.numberOfStates = stateCount;
    this.bitField = BigInt(0);
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
    s.bitField = origin.bitField;
    return s;
  }

  // TODO : Return the object to allow easier usage of these function

  // This method allows to shift a state (add state as 0 at the beginning)
  shift(shiftCount: number): void {
    this.bitField <<= BigInt(shiftCount);
    this.numberOfStates += shiftCount;
  }

  union(rhs: NDFAState): void {
    this.bitField |= rhs.bitField;
  }

  intersect(rhs: NDFAState): void {
    this.bitField &= rhs.bitField;
  }

  contains(state: number): boolean {
    return (this.bitField & BigInt(1<<state)) != 0n;
  }

  addState(state: number): void {
    this.bitField |= BigInt(1 << state);
  }

  removeState(state: number): void {
    this.bitField  &= ~BigInt(1 << state);
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

  toString(): string {
    return String(this.bitField);
  }

  static fromString(s: string, stateCount: number): NDFAState {
    let result = new NDFAState(stateCount);
    result.bitField = BigInt(s);
    return result;
  }

  isEmpty(): boolean {
    for (let i = 0; i < this.numberOfStates; i++) {
      if (this.contains(i)) {
        return false;
      }
    }
    return true;
  }

  protected bitField: bigint;
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

  numberOfStates(): number {
    return this.deltaTable.length;
  }

  addTransition(originState: number, symbolRead: NDFATransitionSymbol, destinationState: number): void {
    assert(originState <= this.numberOfStates(), "originState is out of bounds");
    assert(destinationState <= this.numberOfStates(), "destinationState is out of bounds");
    if(!Object.keys(this.deltaTable[originState]).includes(String(symbolRead))) {
      this.deltaTable[originState][symbolRead] = new NDFAState(this.numberOfStates());
    }
    this.deltaTable[originState][symbolRead].addState(destinationState);
  }

  // TODO Find a way to test the generateDot members
  /* istanbul ignore next */
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
    let statesAfterReadingc = new NDFAState(this.numberOfStates());
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
    let s = new NDFAState(this.numberOfStates());
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

  recognizeEmpty(): boolean {
    let accessible = this.dfs(this.initialState, (i) => {
      let next: number[] = [];
      for (const [symbol, destinations] of Object.entries(this.deltaTable[i])) {
        destinations.foreach((j) => {
          next.push(j);
        })
      }
      return next;
    });
    accessible.intersect(this.finalStates);
    return accessible.isEmpty();
  }

  // This method allows to create "empty states" at the beginning of the automata. It is used mainly for the Thompson's construction which requires to "merge" automatas and create new states
  protected createShiftedStates(shiftCount: number): NDFA {
    let result = new NDFA(shiftCount + this.numberOfStates());
    result.initialState = this.initialState + shiftCount;
    result.finalStates = NDFAState.copy(this.finalStates);
    result.finalStates.shift(shiftCount);

    this.deltaTable.forEach((d, origin) => {
      for (const symbol of Object.keys(d)) {
        let transition = NDFAState.copy(this.deltaTable[origin][symbol]);
        transition.shift(shiftCount);
        result.deltaTable[origin+shiftCount][symbol] = transition;
        
      }
    });
    
    return result;
  }

  private static createRecognizeCharOrEpsilon(c: Regex): NDFA {
    let automata = new NDFA(2);
    switch(c.nodeType) {
      case RegexNodeType.Char:
        automata.addTransition(0, c.children as string, 1);
        break;
      case RegexNodeType.Epsilon:
        automata.addTransition(0, epsilonTransition, 1);
        break;
      default:
        assert(false);
    }
    automata.initialState = 0;
    automata.finalStates = NDFAState.fromBoolArray([false, true]);
    return automata;
  }

  private static createUnion(a: NDFA, b: NDFA): NDFA {
    // We chose state 0 to be new initial state and 1 to be the new final state
    let aShifted = a.createShiftedStates(2);
    let bShifted = b.createShiftedStates(2 + a.numberOfStates());

    // Copy transitions of a in b
    for (let i = 0; i < a.numberOfStates(); i++) {
      bShifted.deltaTable[2+i] = aShifted.deltaTable[2+i];
    }

    bShifted.addTransition(0, epsilonTransition, aShifted.initialState);
    bShifted.addTransition(0, epsilonTransition, bShifted.initialState);
    aShifted.finalStates.foreach((s) => {
      bShifted.addTransition(s, epsilonTransition, 1);
    });
    bShifted.finalStates.foreach((s) => {
      bShifted.addTransition(s, epsilonTransition, 1);
    });

    bShifted.initialState = 0;
    bShifted.finalStates = NDFAState.fromBoolArray([false, true]);

    return bShifted;
  }

  private static createStar(a: NDFA): NDFA {
    let aShifted = a.createShiftedStates(2);
    
    aShifted.addTransition(0, epsilonTransition, aShifted.initialState);
    aShifted.addTransition(0, epsilonTransition, 1);
    aShifted.finalStates.foreach((s) => {
      aShifted.addTransition(s, epsilonTransition, aShifted.initialState);
      aShifted.addTransition(s, epsilonTransition, 1);
    });

    aShifted.initialState = 0;
    aShifted.finalStates = NDFAState.fromBoolArray([false, true]);

    return aShifted;
  }

  private static createConcat(a: NDFA, b: NDFA): NDFA {
    let bShifted = b.createShiftedStates(a.numberOfStates());

    // Copy transitions of a in b
    for (let i = 0; i < a.numberOfStates(); i++) {
      bShifted.deltaTable[i] = a.deltaTable[i];
    }
    
    a.finalStates.foreach((s) => {
      bShifted.addTransition(s, epsilonTransition, bShifted.initialState);
    })

    bShifted.initialState = a.initialState;

    return bShifted;
  }

  static Thompson(i: Regex | String): NDFA {
    if (typeof i == "string") {
      return this.Thompson(Regex.parse(i));
    }
    let e = i as Regex;
    switch (e.nodeType) {
      case RegexNodeType.Empty: {
        assert(false); // We need to firstly eliminate empty in expression
        return new NDFA(0);
      }
      case RegexNodeType.Epsilon:
      case RegexNodeType.Char:
        return NDFA.createRecognizeCharOrEpsilon(e);
      case RegexNodeType.Union: {
        let a = this.Thompson((e.children as Regex[])[0]);
        let b = this.Thompson((e.children as Regex[])[1]);
        return this.createUnion(a, b);
      }
      case RegexNodeType.Concat: {
        let a = this.Thompson((e.children as Regex[])[0]);
        let b = this.Thompson((e.children as Regex[])[1]);
        return this.createConcat(a, b);
      }
      case RegexNodeType.Star: {
        let a = this.Thompson((e.children as Regex));
        return this.createStar(a);
      }
    }
  }

  toDFA(): DFA {
    let table: Record<string, number> = {};

    let initS: NDFAState = new NDFAState(this.numberOfStates());
    initS.addState(this.initialState);

    let initSClosure = this.computeEpsilonClosure(initS);
    table[String(initSClosure)] = 0;

    let result = new DFA(1);

    let visited: string[] = [];
    
    const explore = (origin: NDFAState) => {
      if (visited.includes(String(origin))) {
        return;
      }
      visited.push(String(origin));

      let symbols: string[] = [];
      let originInTable = table[String(origin)];
      origin.foreach((i) => {
        for (const s of Object.keys(this.deltaTable[i])) {
          if (s != epsilonTransition)
            symbols.push(s);
        }
      })

      symbols.forEach((s) => {
        let destination = this.delta(origin, s);
        let destinationInTable = -1;
        if (!Object.keys(table).includes(String(destination))) {
          table[String(destination)] = result.numberOfStates();
          destinationInTable = result.numberOfStates();
          result.addState();
        } else {
          destinationInTable = table[String(destination)];
        }
        result.addTransition(originInTable, s, destinationInTable);
        explore(destination);
      })
    }
    
    explore(initSClosure);

    for(const [stringifiedState, stateInDFA] of Object.entries(table)) {
      let s: NDFAState = NDFAState.fromString(stringifiedState, this.numberOfStates());
      s.intersect(this.finalStates);
      if (!s.isEmpty()) {
        result.finalStates.push(stateInDFA);
      }
    }

    return result;
  }
  

  // A DFS of the labeled graph, the callBack return the next possible explored state
  private dfs(from: number, callBack: (at: number) => number[]): NDFAState {
    let visited = new NDFAState(this.numberOfStates());
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
    return visited;
  }

  private computeEpsilonClosure(state: NDFAState): NDFAState {
    let closure = new NDFAState(this.numberOfStates());
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

