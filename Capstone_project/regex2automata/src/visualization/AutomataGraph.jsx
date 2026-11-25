
import React, { useMemo } from 'react';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

// ------------------------------------------
// Helpers
// ------------------------------------------

function getStateId(state) {
  if (state === null || state === undefined) return '';

  return typeof state === 'object'
    ? String(state.id ?? state.name)
    : String(state);
}

function sameTransition(a, b) {
  return (
    a &&
    b &&
    String(a.from) === String(b.from) &&
    String(a.to) === String(b.to) &&
    String(a.symbol) === String(b.symbol)
  );
}

// ------------------------------------------
// Custom State Node
// ------------------------------------------

function StateNode({ data }) {
  let border = '2px solid #94a3b8';
  let background = '#ffffff';
  let textColor = '#334155';
  let shadow = '0 3px 8px rgba(15, 23, 42, 0.08)';

  // Rejected final state or stuck state
  if (data.isCurrent && data.isRejected) {
    border = '3px solid #dc5353';
    background = '#fff0ef';
    textColor = '#bd3333';
    shadow = '0 0 0 6px rgba(220, 83, 83, 0.14)';
  }

  // Accepted final state
  else if (data.isCurrent && data.isAccepted) {
    border = '5px double #219567';
    background = '#e4f5eb';
    textColor = '#147449';
    shadow = '0 0 0 6px rgba(33, 149, 103, 0.15)';
  }

  // Current simulation state
  else if (data.isCurrent) {
    border = '3px solid #287fba';
    background = '#e6f3ff';
    textColor = '#17619b';
    shadow = '0 0 0 6px rgba(40, 127, 186, 0.13)';
  }

  // User-selected state
  else if (data.isSelected) {
    border = '3px solid #e5a23e';
    background = '#fff3d7';
    textColor = '#885a13';
    shadow = '0 0 0 5px rgba(229, 162, 62, 0.14)';
  }

  // Normal accepting state
  else if (data.isAccepting) {
    border = '5px double #219567';
    background = '#e8f5ed';
    textColor = '#147449';
  }

  return (
    <div
      className="automata-state-node"
      style={{
        width: 76,
        height: 76,
        borderRadius: '50%',
        border,
        background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        fontWeight: 700,
        fontSize: 16,
        color: textColor,
        boxShadow: shadow,
        transition: 'all 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#64748b',
          width: 8,
          height: 8,
          border: '1px solid white',
        }}
      />

      {/* Start arrow */}
      {data.isStart && (
        <span
          style={{
            position: 'absolute',
            left: -27,
            fontSize: 22,
            color: '#287fba',
            fontWeight: 800,
          }}
        >
          →
        </span>
      )}

      {/* State label */}
      <span>{data.label}</span>

      {/* Accepting-state marker */}
      {data.isAccepting && (
        <span
          style={{
            position: 'absolute',
            bottom: -8,
            right: -3,
            background: '#219567',
            color: '#ffffff',
            borderRadius: '50%',
            width: 23,
            height: 23,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
          }}
        >
          ✓
        </span>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#64748b',
          width: 8,
          height: 8,
          border: '1px solid white',
        }}
      />
    </div>
  );
}

const nodeTypes = {
  state: StateNode,
};

// ------------------------------------------
// Automata Graph
// ------------------------------------------

export default function AutomataGraph({
  dfa,
  automatonType = 'DFA',

  activeState = null,
  traversedTransitions = [],
  simulationStatus = null,
  simulationActive = false,

  selectedState = null,
  selectedTransition = null,

  onStateSelect,
  onTransitionSelect,
}) {
  const isRejected = simulationStatus === 'rejected';
  const isStuck = simulationStatus === 'stuck';
  const isAccepted = simulationStatus === 'accepted';

  // ------------------------------------------
  // Nodes
  // ------------------------------------------

  const nodes = useMemo(() => {
    if (!dfa?.states) return [];

    return dfa.states.map((state, index) => {
      const stateId = getStateId(state);

      const isCurrent =
        simulationActive &&
        String(stateId) === String(activeState);

      const isAccepting =
        automatonType === 'NFA'
          ? String(getStateId(dfa.acceptState)) === stateId
          : (dfa.acceptStates || []).some(
                (acceptState) =>
                  getStateId(acceptState) === stateId
              );

      const isStart =
        String(getStateId(dfa.startState)) === stateId;

      const isSelected =
        String(selectedState) === stateId;

      // Red is only applied to the final rejected/stuck state.
      const isRejectedState =
        isCurrent && (isRejected || isStuck);

      const isAcceptedState =
        isCurrent && isAccepted;

      return {
        id: stateId,
        type: 'state',

        position: {
          x: (index % 4) * 205 + 100,
          y: Math.floor(index / 4) * 175 + 100,
        },

        data: {
          label: stateId,
          isStart,
          isAccepting,
          isCurrent,
          isSelected,
          isRejected: isRejectedState,
          isAccepted: isAcceptedState,
        },
      };
    });
  }, [
    dfa,
    automatonType,
    activeState,
    simulationActive,
    simulationStatus,
    selectedState,
    isRejected,
    isStuck,
    isAccepted,
  ]);

  // ------------------------------------------
  // Edges / Transitions
  // ------------------------------------------

  const edges = useMemo(() => {
    if (!dfa?.transitions) return [];

    const latestTransition = traversedTransitions.length
      ? traversedTransitions[traversedTransitions.length - 1]
      : null;

    return dfa.transitions.map((transition, index) => {
      const isTraversed = traversedTransitions.some((item) =>
        sameTransition(item, transition)
      );

      const isLatest =
        simulationActive &&
        sameTransition(latestTransition, transition);

      const isSelected = sameTransition(
        selectedTransition,
        transition
      );

      let edgeColor = '#94a3b8';
      let edgeWidth = 2;

      // --------------------------------------
      // Valid executed transitions remain green.
      // Rejection does NOT make a valid edge red.
      // --------------------------------------

      if (isTraversed) {
        edgeColor = '#219567';
        edgeWidth = 3.5;
      }

      // Highlight the current transition during simulation
      if (isLatest && !isAccepted && !isRejected && !isStuck) {
        edgeColor = '#287fba';
        edgeWidth = 4;
      }

      // Selected transition takes visual priority
      if (isSelected) {
        edgeColor = '#e5a23e';
        edgeWidth = 4.5;
      }

      return {
        id: `edge-${index}`,
        source: String(transition.from),
        target: String(transition.to),
        label: String(transition.symbol),
        type: 'smoothstep',

        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },

        style: {
          stroke: edgeColor,
          strokeWidth: edgeWidth,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
        },

        labelStyle: {
          fill: '#334155',
          fontWeight: 700,
          fontSize: 13,
        },

        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.96,
        },

        labelBgPadding: [5, 3],
        labelBgBorderRadius: 4,
      };
    });
  }, [
    dfa,
    traversedTransitions,
    simulationActive,
    isRejected,
    isStuck,
    isAccepted,
    selectedTransition,
  ]);

  // ------------------------------------------
  // No Automaton
  // ------------------------------------------

  if (!dfa) {
    return (
      <div className="automata-empty-graph">
        <p>Please generate an automaton first.</p>
      </div>
    );
  }

  // ------------------------------------------
  // Graph UI
  // ------------------------------------------

  return (
    <div className="automata-graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}

        fitView
        fitViewOptions={{ padding: 0.2 }}

        nodesDraggable
        nodesConnectable={false}
        elementsSelectable

        onNodeClick={(_, node) => {
          onStateSelect?.(node.id);
        }}

        onEdgeClick={(_, edge) => {
          const selected = dfa.transitions.find(
            (_, index) => `edge-${index}` === edge.id
          );

          if (selected) {
            onTransitionSelect?.(selected);
          }
        }}

        defaultEdgeOptions={{
          type: 'smoothstep',
        }}

        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background
          gap={22}
          size={1}
          color="#dce5dc"
          variant="dots"
        />

        <Controls />

        <MiniMap
          nodeColor={(node) => {
            if (node.data?.isRejected) return '#dc5353';
            if (node.data?.isAccepted) return '#219567';
            if (node.data?.isCurrent) return '#287fba';
            if (node.data?.isSelected) return '#e5a23e';
            if (node.data?.isAccepting) return '#219567';
            return '#b7c9c1';
          }}
          maskColor="rgba(245, 243, 235, 0.65)"
        />
      </ReactFlow>

      <div className="graph-canvas-label">
        {automatonType === 'NFA'
          ? 'THOMPSON NFA'
          : 'GENERATED DFA'}
      </div>
    </div>
  );
}
