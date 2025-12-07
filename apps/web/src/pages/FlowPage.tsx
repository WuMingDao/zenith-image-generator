import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { Send, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ImageGridNode, {
  type ImageGridNodeData,
} from "@/components/flow/ImageGridNode";
import { getLayoutedElements } from "@/components/flow/layout";

const nodeTypes = { imageGrid: ImageGridNode };

export default function FlowPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [prompt, setPrompt] = useState("");
  const nodeIdRef = useRef(0);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(() => {
    if (!prompt.trim()) return;

    const newId = `node-${++nodeIdRef.current}`;
    const lastNodeId = nodes.length > 0 ? nodes[nodes.length - 1].id : null;

    const newNode: Node<ImageGridNodeData> = {
      id: newId,
      type: "imageGrid",
      position: { x: 0, y: 0 },
      data: { prompt: prompt.trim(), width: 512, height: 512 },
    };

    const newEdge: Edge | null = lastNodeId
      ? { id: `e-${lastNodeId}-${newId}`, source: lastNodeId, target: newId }
      : null;

    const nextNodes = [...nodes, newNode];
    const nextEdges = newEdge ? [...edges, newEdge] : edges;

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nextNodes,
      nextEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setPrompt("");
  }, [prompt, nodes, edges, setNodes, setEdges]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNode();
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-zinc-950"
      >
        <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} />
        <Controls className="!bg-zinc-900 !border-zinc-800 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button:hover]:!bg-zinc-700 [&>button>svg]:!fill-zinc-300" />
      </ReactFlow>

      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </Link>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4"
      >
        <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl p-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your image..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none"
          />
          <button
            onClick={addNode}
            disabled={!prompt.trim()}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5 text-zinc-300" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
