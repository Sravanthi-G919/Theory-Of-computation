
import { useEffect, useMemo, useState } from 'react';

import { regexToPostfix } from './algorithms/regexToPostfix.js';
import { buildNFA } from './algorithms/thompsonNFA.js';
import { convertNFAtoDFA } from './algorithms/nfaToDfa.js';
import { testDFAString } from './algorithms/stringTester.js';
import { createSimulation } from './algorithms/dfaSimulator.js';
import AutomataGraph from './visualization/AutomataGraph.jsx';

const HISTORY_KEY = 'regex2automata_history';

const examples = ['a', 'a|b', 'ab', 'a*', '(a|b)*abb', 'a*b'];

function readHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getStateId(state) {
  return typeof state === 'object' && state !== null
    ? String(state.id ?? state.name)
    : String(state);
}

export default function App() {
  const [regex, setRegex] = useState('(a|b)*abb');
  const [postfix, setPostfix] = useState('');
  const [nfa, setNfa] = useState(null);
  const [dfa, setDfa] = useState(null);

  const [message, setMessage] = useState(
    'Enter a regular expression and generate its DFA.'
  );
  const [messageType, setMessageType] = useState('info');

  const [testString, setTestString] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [simulationIndex, setSimulationIndex] = useState(0);

  const [history, setHistory] = useState(readHistory);
  const [historySearch, setHistorySearch] = useState('');
  const [currentHistoryId, setCurrentHistoryId] = useState(null);

  const [activeSection, setActiveSection] = useState('converter');

  // Phase 2: graph and automaton selection
  const [viewMode, setViewMode] = useState('DFA');
  const [selectedState, setSelectedState] = useState(null);
  const [selectedTransition, setSelectedTransition] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      setMessage('Could not save history in this browser.');
      setMessageType('error');
    }
  }, [history]);

  function generateAutomata(
    expression = regex,
    saveToHistory = true,
    historyId = null
  ) {
    try {
      const cleanExpression = expression.trim();

      if (!cleanExpression) {
        throw new Error('Please enter a regular expression.');
      }

      const generatedPostfix = regexToPostfix(cleanExpression);
      const generatedNfa = buildNFA(generatedPostfix);
      const generatedDfa = convertNFAtoDFA(generatedNfa);

      setRegex(cleanExpression);
      setPostfix(generatedPostfix);
      setNfa(generatedNfa);
      setDfa(generatedDfa);

      setTestString('');
      setTestResult(null);
      setSimulation(null);
      setSimulationIndex(0);

      setViewMode('DFA');
      setSelectedState(null);
      setSelectedTransition(null);

      setMessage('NFA and DFA generated successfully.');
      setMessageType('success');

      if (saveToHistory) {
        const newId = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;

        const entry = {
          id: newId,
          regex: cleanExpression,
          postfix: generatedPostfix,
          nfaStates: generatedNfa.states.length,
          dfaStates: generatedDfa.states.length,
          transitions: generatedDfa.transitions.length,
          createdAt: new Date().toISOString(),
          tests: [],
        };

        setHistory((previous) => [
          entry,
          ...previous.filter((item) => item.regex !== cleanExpression),
        ]);

        setCurrentHistoryId(newId);
      } else if (historyId) {
        setCurrentHistoryId(historyId);
      }

      return true;
    } catch (error) {
      setMessage(error.message || 'Could not convert this expression.');
      setMessageType('error');

      setNfa(null);
      setDfa(null);
      setPostfix('');
      setTestResult(null);
      setSimulation(null);
      setSimulationIndex(0);
      setSelectedState(null);
      setSelectedTransition(null);

      return false;
    }
  }

  function handleConvert(event) {
    event?.preventDefault();
    generateAutomata(regex, true);
  }

  function loadHistoryEntry(entry) {
    const successful = generateAutomata(entry.regex, false, entry.id);

    if (successful) {
      setActiveSection('converter');
      setMessage(`Loaded previous expression: ${entry.regex}`);
      setMessageType('success');
    }
  }

  function deleteHistoryEntry(id) {
    setHistory((previous) => previous.filter((item) => item.id !== id));

    if (currentHistoryId === id) {
      setCurrentHistoryId(null);
    }
  }

  function clearHistory() {
    setHistory([]);
    setCurrentHistoryId(null);
  }

  function handleTest(event) {
    event?.preventDefault();

    if (!dfa) {
      setMessage('Generate a DFA before testing a string.');
      setMessageType('error');
      return;
    }

    try {
      const result = testDFAString(dfa, testString);
      const sim = createSimulation(dfa, testString);

      setTestResult(result);
      setSimulation(sim);
      setSimulationIndex(0);
      setViewMode('DFA');
      setSelectedState(null);
      setSelectedTransition(null);

      if (currentHistoryId) {
        setHistory((previous) =>
          previous.map((entry) =>
            entry.id === currentHistoryId
              ? {
                  ...entry,
                  tests: [
                    {
                      input: testString,
                      accepted: Boolean(result.accepted),
                      testedAt: new Date().toISOString(),
                    },
                    ...(entry.tests || []),
                  ],
                }
              : entry
          )
        );
      }
    } catch (error) {
      setMessage(error.message || 'Could not test this string.');
      setMessageType('error');
    }
  }

  const steps = simulation?.steps || [];
  const currentStep = steps[simulationIndex] || null;

  const simulationFinished =
    Boolean(simulation) && simulationIndex === steps.length - 1;

  const traversedTransitions = simulation
    ? steps
        .slice(1, simulationIndex + 1)
        .filter((step) => step.transition)
        .map((step) => step.transition)
    : [];

  // Keep "stuck" separate from an ordinary non-accepting final state.
  const simulationStatus =
    simulation && simulationFinished
      ? simulation.accepted
        ? 'accepted'
        : currentStep?.status === 'stuck'
          ? 'stuck'
          : 'rejected'
      : currentStep?.status === 'stuck'
        ? 'stuck'
        : null;

  function resetSimulation() {
    setSimulationIndex(0);
  }

  function nextStep() {
    setSimulationIndex((index) =>
      Math.min(index + 1, steps.length - 1)
    );
  }

  function previousStep() {
    setSimulationIndex((index) => Math.max(index - 1, 0));
  }

  const transitionTable = useMemo(() => {
    if (!dfa) return [];

    const alphabet = dfa.alphabet || [];

    return dfa.states.map((state) => {
      const stateId = getStateId(state);

      const row = {
        id: stateId,
        isStart: stateId === String(dfa.startState),
        isAccepting: (dfa.acceptStates || []).some(
          (acceptState) => getStateId(acceptState) === stateId
        ),
        isDead:
          Array.isArray(state.nfaStates) &&
          state.nfaStates.length === 0,
        transitions: {},
      };

      alphabet.forEach((symbol) => {
        const transition = dfa.transitions.find(
          (item) =>
            String(item.from) === stateId &&
            String(item.symbol) === String(symbol)
        );

        row.transitions[symbol] = transition
          ? String(transition.to)
          : '—';
      });

      return row;
    });
  }, [dfa]);

  const filteredHistory = history.filter((entry) =>
    entry.regex.toLowerCase().includes(historySearch.toLowerCase())
  );

  const acceptingCount = dfa?.acceptStates?.length || 0;

  const activeAutomaton = viewMode === 'NFA' ? nfa : dfa;

  function navigate(section) {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function selectTableState(stateId) {
    setSelectedState(stateId);
    setSelectedTransition(null);
  }

  function selectTableTransition(from, to, symbol) {
    setSelectedState(from);

    if (to === '—') {
      setSelectedTransition(null);
      return;
    }

    setSelectedTransition({ from, to, symbol });
  }

  function changeView(mode) {
    setViewMode(mode);
    setSelectedState(null);
    setSelectedTransition(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R₂</div>
          <div>
            <h2>Regex2Automata</h2>
            <span>Automata Lab</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          <button
            className={activeSection === 'converter' ? 'nav-link active' : 'nav-link'}
            onClick={() => navigate('converter')}
          >
            <span className="nav-icon">⌘</span>
            Regex Converter
          </button>

          <button
            className={activeSection === 'visualizer' ? 'nav-link active' : 'nav-link'}
            onClick={() => navigate('visualizer')}
          >
            <span className="nav-icon">◎</span>
            Automata Visualizer
          </button>

          <button
            className={activeSection === 'transition-table' ? 'nav-link active' : 'nav-link'}
            onClick={() => navigate('transition-table')}
          >
            <span className="nav-icon">▦</span>
            Transition Table
          </button>

          <button
            className={activeSection === 'tester' ? 'nav-link active' : 'nav-link'}
            onClick={() => navigate('tester')}
          >
            <span className="nav-icon">✓</span>
            String Tester
          </button>

          <button
            className={activeSection === 'history' ? 'nav-link active' : 'nav-link'}
            onClick={() => navigate('history')}
          >
            <span className="nav-icon">↺</span>
            History
            {history.length > 0 && (
              <span className="nav-count">{history.length}</span>
            )}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">i</span>
            <div>
              <strong>Learning workspace</strong>
              <p>Convert, visualize and test finite automata.</p>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="footer-avatar">R₂</div>
            <div>
              <strong>Regex2Automata</strong>
              <span>Capstone Project</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">REGEX2AUTOMATA / WORKSPACE</div>
            <h1>Automata Dashboard</h1>
          </div>

          <div className="engine-status">
            <span className="status-dot" />
            Engine ready
          </div>
        </header>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">CURRENT EXPRESSION</span>
            <strong>{dfa ? regex : '—'}</strong>
            <small>Regular expression</small>
          </div>

          <div className="summary-card">
            <span className="summary-label">NFA STATES</span>
            <strong>{nfa ? nfa.states.length : '—'}</strong>
            <small>Thompson construction</small>
          </div>

          <div className="summary-card">
            <span className="summary-label">DFA STATES</span>
            <strong>{dfa ? dfa.states.length : '—'}</strong>
            <small>Subset construction</small>
          </div>

          <div className="summary-card">
            <span className="summary-label">ACCEPTING STATES</span>
            <strong>{dfa ? acceptingCount : '—'}</strong>
            <small>DFA final states</small>
          </div>
        </section>

        {/* CONVERTER */}
        <section className="panel section-anchor" id="converter">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">01 / CONVERSION</span>
              <h2>Regex Converter</h2>
              <p>Enter a regular expression to generate its NFA and DFA.</p>
            </div>
            <span className="section-symbol">⌘</span>
          </div>

          <form onSubmit={handleConvert}>
            <label className="input-label" htmlFor="regex-input">
              REGULAR EXPRESSION
            </label>

            <div className="converter-row">
              <input
                id="regex-input"
                className="main-input regex-input"
                value={regex}
                onChange={(event) => setRegex(event.target.value)}
                placeholder="Example: (a|b)*abb"
              />

              <button className="primary-button" type="submit">
                Generate Automata <span>→</span>
              </button>
            </div>
          </form>

          <div className="examples-row">
            <span>QUICK EXAMPLES</span>
            {examples.map((example) => (
              <button
                key={example}
                className="example-button"
                onClick={() => setRegex(example)}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>

          {message && (
            <div className={`message-banner ${messageType}`}>
              <span>{messageType === 'error' ? '!' : '✓'}</span>
              {message}
            </div>
          )}

          {dfa && (
            <div className="conversion-summary">
              <div>
                <span>POSTFIX</span>
                <strong>{postfix}</strong>
              </div>
              <div>
                <span>ALPHABET</span>
                <strong>{dfa.alphabet.join(', ') || 'ε'}</strong>
              </div>
              <div>
                <span>DFA TRANSITIONS</span>
                <strong>{dfa.transitions.length}</strong>
              </div>
            </div>
          )}
        </section>

        {/* VISUALIZER */}
        <section className="panel section-anchor" id="visualizer">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">02 / VISUALIZATION</span>
              <h2>Automata Visualizer</h2>
              <p>Switch between the Thompson NFA and the generated DFA.</p>
            </div>
            <span className="section-symbol">◎</span>
          </div>

          {dfa && nfa ? (
            <>
              <div className="automaton-switch">
                <div>
                  <strong>Choose automaton</strong>
                  <span>View either stage of the conversion</span>
                </div>

                <div className="switch-buttons">
                  <button
                    type="button"
                    className={viewMode === 'NFA' ? 'switch-button active' : 'switch-button'}
                    onClick={() => changeView('NFA')}
                  >
                    NFA
                    <span>{nfa.states.length} states</span>
                  </button>

                  <button
                    type="button"
                    className={viewMode === 'DFA' ? 'switch-button active' : 'switch-button'}
                    onClick={() => changeView('DFA')}
                  >
                    DFA
                    <span>{dfa.states.length} states</span>
                  </button>
                </div>
              </div>

              <div className="graph-toolbar">
                <div>
                  <strong>
                    {viewMode === 'NFA'
                      ? 'Nondeterministic Finite Automaton'
                      : 'Deterministic Finite Automaton'}
                  </strong>
                  <span>
                    {activeAutomaton.states.length} states ·{' '}
                    {activeAutomaton.transitions.length} transitions
                  </span>
                </div>
                <span className="graph-status">Generated</span>
              </div>

              <AutomataGraph
                dfa={activeAutomaton}
                automatonType={viewMode}
                activeState={viewMode === 'DFA' ? currentStep?.state ?? null : null}
                traversedTransitions={viewMode === 'DFA' ? traversedTransitions : []}
                simulationStatus={viewMode === 'DFA' ? simulationStatus : null}
                simulationActive={viewMode === 'DFA' && Boolean(simulation)}
                selectedState={selectedState}
                selectedTransition={viewMode === 'DFA' ? selectedTransition : null}
                onStateSelect={(stateId) => {
                  setSelectedState(stateId);
                  setSelectedTransition(null);
                }}
                onTransitionSelect={(transition) => {
                  setSelectedState(transition.from);
                  setSelectedTransition(transition);
                }}
              />

              <div className="graph-legend">
                <span><i className="legend-circle normal" /> Normal state</span>
                <span><i className="legend-circle accepting" /> Accepting state</span>
                <span><i className="legend-circle selected" /> Selected state</span>
                <span><i className="legend-line normal-line" /> Transition</span>
                <span><i className="legend-line red-line" /> Rejected path</span>
                <span><i className="legend-line green-line" /> Accepted path</span>
              </div>

              {selectedState && (
                <div className="selection-info">
                  <span>Selected state</span>
                  <strong>{selectedState}</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState(null);
                      setSelectedTransition(null);
                    }}
                  >
                    Clear selection
                  </button>
                </div>
              )}

              {viewMode === 'NFA' && (
                <p className="table-footnote">
                  NFA transitions may include ε (epsilon) transitions. Switch to DFA
                  to use the transition table and string simulator.
                </p>
              )}
            </>
          ) : (
            <div className="empty-state graph-empty">
              <div className="empty-icon">◎</div>
              <h3>No automaton generated yet</h3>
              <p>Enter a regular expression above and select Generate Automata.</p>
            </div>
          )}
        </section>

        {/* TRANSITION TABLE */}
        <section className="panel section-anchor" id="transition-table">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">03 / DFA REFERENCE</span>
              <h2>Transition Table</h2>
              <p>Select a state or transition to locate it in the DFA graph.</p>
            </div>
            <span className="section-symbol">▦</span>
          </div>

          {dfa ? (
            <>
              <div className="table-note">
                <span>→</span> Start state
                <span className="table-star">*</span> Accepting state
              </div>

              <div className="table-wrap">
                <table className="transition-table">
                  <thead>
                    <tr>
                      <th>DFA STATE</th>
                      {(dfa.alphabet || []).map((symbol) => (
                        <th key={symbol}>INPUT: {symbol}</th>
                      ))}
                      <th>STATE TYPE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transitionTable.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => selectTableState(row.id)}
                        className={[
                          row.isAccepting ? 'accepting-row' : '',
                          row.isStart ? 'start-row' : '',
                          selectedState === row.id ? 'selected-row' : '',
                        ].join(' ')}
                      >
                        <td className="state-cell">
                          {row.isStart && <span className="start-arrow">→</span>}
                          {row.isAccepting && <span className="accept-star">*</span>}
                          {row.id}
                        </td>

                        {(dfa.alphabet || []).map((symbol) => {
                          const destination = row.transitions[symbol];

                          return (
                            <td key={symbol}>
                              <button
                                type="button"
                                className={[
                                  'transition-cell-button',
                                  selectedTransition?.from === row.id &&
                                  selectedTransition?.symbol === symbol
                                    ? 'selected-transition-cell'
                                    : '',
                                ].join(' ')}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectTableTransition(
                                    row.id,
                                    destination,
                                    symbol
                                  );
                                }}
                                title={`Select ${row.id} on input ${symbol}`}
                              >
                                {destination}
                              </button>
                            </td>
                          );
                        })}

                        <td>
                          {row.isAccepting ? (
                            <span className="type-pill accepting-pill">Accepting</span>
                          ) : row.isStart ? (
                            <span className="type-pill start-pill">Start</span>
                          ) : row.isDead ? (
                            <span className="type-pill dead-pill">Dead</span>
                          ) : (
                            <span className="type-pill normal-pill">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="table-footnote">
                Select a row to highlight its state. Select an input cell to highlight
                that transition in the graph. A dash (—) means no transition exists.
              </p>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">▦</div>
              <h3>Transition table not available</h3>
              <p>Generate a DFA to see its transition table.</p>
            </div>
          )}
        </section>

        {/* STRING TESTER */}
        <section className="panel section-anchor" id="tester">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">04 / TESTING</span>
              <h2>String Tester</h2>
              <p>Check whether an input string belongs to the language.</p>
            </div>
            <span className="section-symbol">✓</span>
          </div>

          <form className="tester-form" onSubmit={handleTest}>
            <div className="tester-input">
              <label className="input-label" htmlFor="test-input">
                TEST STRING
              </label>
              <input
                id="test-input"
                className="main-input"
                value={testString}
                onChange={(event) => {
                  setTestString(event.target.value);
                  setTestResult(null);
                  setSimulation(null);
                  setSimulationIndex(0);
                }}
                placeholder="Enter a string to test..."
                disabled={!dfa}
              />
            </div>

            <button
              className="primary-button test-button"
              type="submit"
              disabled={!dfa}
            >
              Test string →
            </button>
          </form>

          {testResult && (
            <div className={`test-result ${testResult.accepted ? 'result-accepted' : 'result-rejected'}`}>
              <div className="result-heading">
                <span className="result-symbol">
                  {testResult.accepted ? '✓' : '×'}
                </span>
                <div>
                  <h3>{testResult.accepted ? 'String Accepted' : 'String Rejected'}</h3>
                  <p>
                    {testResult.reason ||
                      (testResult.accepted
                        ? 'Input string accepted.'
                        : 'Input string rejected.')}
                  </p>
                </div>
              </div>

              <div className="result-details">
                <div>
                  <span>STATE PATH</span>
                  <strong>{(testResult.path || []).join(' → ') || '—'}</strong>
                </div>
                <div>
                  <span>FINAL STATE</span>
                  <strong>{testResult.finalState || '—'}</strong>
                </div>
              </div>
            </div>
          )}

          {simulation && currentStep && (
            <div className="simulation-panel">
              <div className="simulation-heading">
                <div>
                  <h3>Step-by-step simulation</h3>
                  <p>Follow each input character through the DFA graph.</p>
                </div>
                <span className="step-count">
                  STEP {simulationIndex} / {steps.length - 1}
                </span>
              </div>

              <div className="input-character-list">
                {testString.length === 0 ? (
                  <span className="empty-input-symbol">ε (empty string)</span>
                ) : (
                  testString.split('').map((character, index) => (
                    <span
                      key={`${character}-${index}`}
                      className={
                        index < simulationIndex
                          ? 'character-box processed'
                          : 'character-box'
                      }
                    >
                      {character}
                    </span>
                  ))
                )}
              </div>

              <div className="simulation-stats">
                <div>
                  <span>CURRENT STATE</span>
                  <strong>{currentStep.state}</strong>
                </div>
                <div>
                  <span>CHARACTER READ</span>
                  <strong>{currentStep.character ?? '—'}</strong>
                </div>
                <div>
                  <span>INPUT POSITION</span>
                  <strong>{currentStep.position} / {testString.length}</strong>
                </div>
              </div>

              <div className={`step-description ${currentStep.status === 'stuck' ? 'step-error' : ''}`}>
                {simulationIndex === 0
                  ? `Starting at state ${currentStep.state}. No characters have been read yet.`
                  : currentStep.status === 'stuck'
                    ? currentStep.message
                    : `Read '${currentStep.character}': moved to ${currentStep.state}.`}
              </div>

              <div className="simulation-controls">
                <button type="button" onClick={resetSimulation}>↤ Start</button>
                <button
                  type="button"
                  onClick={previousStep}
                  disabled={simulationIndex === 0}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={simulationIndex >= steps.length - 1}
                >
                  Next →
                </button>
              </div>

              {simulationFinished && (
                <div className={`simulation-finish ${simulation.accepted ? 'finish-accepted' : 'finish-rejected'}`}>
                  <strong>
                    {simulation.accepted
                      ? '✓ Simulation complete — Accepted'
                      : '× Simulation complete — Rejected'}
                  </strong>
                  <p>{simulation.reason}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* HISTORY */}
        <section className="panel section-anchor" id="history">
          <div className="panel-heading history-heading">
            <div>
              <span className="section-kicker">05 / RECENT ACTIVITY</span>
              <h2>Conversion History</h2>
              <p>Your previous regular expressions and their test results.</p>
            </div>

            {history.length > 0 && (
              <button
                className="text-button danger-text"
                type="button"
                onClick={clearHistory}
              >
                Clear history
              </button>
            )}
          </div>

          <div className="history-search">
            <span>⌕</span>
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search previous expressions..."
            />
          </div>

          {filteredHistory.length > 0 ? (
            <div className="history-list">
              {filteredHistory.map((entry) => (
                <article className="history-item" key={entry.id}>
                  <div className="history-expression">
                    <div className="history-regex-icon">R</div>
                    <div>
                      <strong>{entry.regex}</strong>
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="history-meta">
                    <span>{entry.nfaStates} NFA states</span>
                    <span>{entry.dfaStates} DFA states</span>
                    <span>{entry.transitions} transitions</span>
                    <span>{(entry.tests || []).length} tests</span>
                  </div>

                  <div className="history-actions">
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => loadHistoryEntry(entry)}
                    >
                      Load
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      title="Delete history entry"
                      onClick={() => deleteHistoryEntry(entry.id)}
                    >
                      ×
                    </button>
                  </div>

                  {(entry.tests || []).length > 0 && (
                    <div className="history-tests">
                      {entry.tests.slice(0, 3).map((test, index) => (
                        <span
                          key={`${entry.id}-${index}`}
                          className={test.accepted ? 'history-test-pass' : 'history-test-fail'}
                        >
                          {test.input === '' ? 'ε' : test.input}
                          {' · '}
                          {test.accepted ? 'Accepted' : 'Rejected'}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">↺</div>
              <h3>
                {history.length
                  ? 'No matching history'
                  : 'No conversion history yet'}
              </h3>
              <p>
                {history.length
                  ? 'Try a different search expression.'
                  : 'Generate a DFA and it will appear here automatically.'}
              </p>
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>Regex2Automata</span>
          <span>Finite Automata Visualizer</span>
        </footer>
      </main>
    </div>
  );
}
