'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  getSmoothStepPath,
  BaseEdge,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  UserMinus,
  Webhook,
  Clock,
  Save,
  Play,
  GitBranch,
  Phone,
  Split,
  Tag,
  Layout,
  Calendar,
  X,
  Sparkles,
  Wand2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCampaigns } from '@/lib/hooks/use-campaigns';
import { useTemplates } from '@/lib/hooks/use-templates';
import { useContentAiTemplates, useJourneyAudioFiles } from '@/lib/hooks/use-content-ai';
import { useWebhooks } from '@/lib/hooks/use-webhooks';
import { useNumberPools } from '@/lib/hooks/use-twilio';
import { useEventTypes } from '@/lib/hooks/use-event-types';
import { useVoiceTemplates, usePreviewVoiceTemplate, useVoiceTemplate } from '@/lib/hooks/use-voice-messages';
import { useVoiceAudioFiles, useVoiceDids, useDidPools } from '@/lib/hooks/use-calls';
import { useCreateJourney, useAddJourneyNode, useUpdateJourneyNode, useDeleteJourneyNode, useJourneys, useJourney, useUpdateJourney } from '@/lib/hooks/use-journeys';
import { useGenerateWebhookNodeWithAi } from '@/lib/hooks/use-integration-builder';
import { AiIntegrationBuilder } from '@/components/integrations/ai-integration-builder';
import { useLeadStatuses } from '@/lib/hooks/use-lead-statuses';
import { toast } from 'sonner';

type NodeType = 'SEND_SMS' | 'ADD_TO_CAMPAIGN' | 'REMOVE_FROM_CAMPAIGN' | 'EXECUTE_WEBHOOK' | 'TIME_DELAY' | 'CONDITION' | 'WEIGHTED_PATH' | 'MAKE_CALL' | 'UPDATE_CONTACT_STATUS';

interface NodeData {
  type: NodeType;
  label: string;
  config: any;
  connections?: {
    nextNodeId?: string;
    outputs?: Record<string, string>;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
}

const nodeIcons: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  SEND_SMS: MessageSquare,
  ADD_TO_CAMPAIGN: Users,
  REMOVE_FROM_CAMPAIGN: UserMinus,
  EXECUTE_WEBHOOK: Webhook,
  TIME_DELAY: Clock,
  CONDITION: GitBranch,
  WEIGHTED_PATH: Split,
  MAKE_CALL: Phone,
  UPDATE_CONTACT_STATUS: Tag,
};

// Clean monochrome design - No colors, elegant grayscale aesthetic
const nodeStyles = {
  // Unified styling for all nodes
  border: 'border-slate-200',
  borderHover: 'hover:border-slate-300',
  borderSelected: 'border-slate-400',
  bg: 'bg-white',
  accent: 'bg-slate-50',
  text: 'text-slate-700',
  textSecondary: 'text-slate-500',
  iconBg: 'bg-slate-100',
  iconBgHover: 'bg-slate-200',
  handleConnected: 'bg-slate-600',
  handleUnconnected: 'bg-slate-300',
  handleHover: 'bg-slate-400',
};

// Define outputs for each node type
const nodeOutputs: Record<NodeType, string[]> = {
  SEND_SMS: ['success', 'failed', 'opted_out', 'reply'],
  MAKE_CALL: ['success', 'failed', 'answered', 'no_answer', 'busy'],
  ADD_TO_CAMPAIGN: ['success', 'failed'],
  REMOVE_FROM_CAMPAIGN: ['success', 'failed'],
  EXECUTE_WEBHOOK: ['success', 'failed'],
  UPDATE_CONTACT_STATUS: ['success', 'failed'],
  TIME_DELAY: ['completed'],
  CONDITION: [], // Handled via branches
  WEIGHTED_PATH: [], // Handled via paths
};

const outputLabels: Record<string, string> = {
  success: 'Success',
  failed: 'Failed',
  opted_out: 'Opted Out',
  reply: 'Reply',
  answered: 'Answered',
  no_answer: 'No Answer',
  busy: 'Busy',
  completed: 'Completed',
};


function CustomNode({ id, data, selected }: { id: string; data: NodeData; selected: boolean }) {
  const Icon = nodeIcons[data.type];
  const styles = nodeStyles;
  const isCondition = data.type === 'CONDITION';
  const isWeightedPath = data.type === 'WEIGHTED_PATH';
  const branchCount = data.config?.branches?.length || 0;
  const pathCount = data.config?.paths?.length || 0;
  const outputs = (nodeOutputs[data.type] || []) as string[];
  const [isHovered, setIsHovered] = useState(false);
  const reactFlowInstance = useReactFlow();
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    reactFlowInstance.deleteElements({ nodes: [{ id }] });
  }, [id, reactFlowInstance]);
  
  // Utility nodes: smaller, diamond/hexagon shape
  const isUtilityNode = data.type === 'TIME_DELAY' || data.type === 'WEIGHTED_PATH' || data.type === 'CONDITION';

  // Get node details based on type and config
  const getNodeDetails = (): string => {
    const config = data.config || {};
    
    switch (data.type) {
      case 'TIME_DELAY':
        if (config.delayAtTime) {
          return `At ${config.delayAtTime}`;
        } else if (config.delayValue && config.delayUnit) {
          const unit = config.delayUnit.toLowerCase();
          return `${config.delayValue} ${unit}`;
        }
        return 'Not configured';
      
      case 'SEND_SMS':
        if (config.contentAiTemplateId) {
          return 'Using Content AI';
        } else if (config.templateId) {
          return 'Using template';
        } else if (config.messageContent) {
          const preview = config.messageContent.substring(0, 30);
          return preview.length < config.messageContent.length ? `${preview}...` : preview;
        }
        return 'No message set';
      
      case 'ADD_TO_CAMPAIGN':
        return config.campaignName || config.campaignId || 'No campaign selected';
      
      case 'MAKE_CALL':
        if (config.audioFile) {
          return `Audio: ${config.audioFile}`;
        } else if (config.voiceTemplateId) {
          return 'Using voice template';
        }
        return 'Not configured';
      
      case 'REMOVE_FROM_CAMPAIGN':
        return config.campaignName || config.campaignId || 'No campaign selected';
      
      case 'EXECUTE_WEBHOOK':
        if (config.webhookUrl) {
          try {
            const url = new URL(config.webhookUrl);
            return `${config.webhookMethod || 'POST'} ${url.hostname}`;
          } catch {
            return config.webhookUrl.substring(0, 25) + '...';
          }
        }
        return 'No webhook URL';
      
      case 'CONDITION':
        if (branchCount > 0) {
          const activeBranches = config.branches.filter((b: any) => b.condition.field && b.condition.operator);
          return `${activeBranches.length} condition${activeBranches.length !== 1 ? 's' : ''}`;
        }
        return 'No conditions set';
      
      case 'WEIGHTED_PATH':
        if (pathCount > 0) {
          const totalPercentage = config.paths.reduce((sum: number, p: any) => sum + (p.percentage || 0), 0);
          return `${pathCount} path${pathCount !== 1 ? 's' : ''} (${totalPercentage}%)`;
        }
        return 'No paths configured';
      
      case 'UPDATE_CONTACT_STATUS':
        if (config.leadStatus) {
          return config.leadStatus; // Status name is already user-friendly
        }
        return 'No status selected';
      
      default:
        return '';
    }
  };

  const nodeDetails = getNodeDetails();
  const hasDetails = nodeDetails && nodeDetails !== 'Not configured' && nodeDetails !== 'No message set' && 
                     nodeDetails !== 'No campaign selected' && nodeDetails !== 'No webhook URL' && 
                     nodeDetails !== 'No conditions set' && nodeDetails !== 'No paths configured';

  // SIMPLIFIED: Fixed width for all nodes (no multiple outputs)
  const minWidth = isUtilityNode ? 180 : 260;
  const maxWidth = isUtilityNode ? 220 : 340;

  // Clean connection handle styling
  const getConnectionHandleClass = (isConnected: boolean) => {
    if (isConnected) {
      return `!${styles.handleConnected} !border-white !shadow-md`;
    }
    return `!${styles.handleUnconnected} hover:!${styles.handleHover} !border-white`;
  };

  // Render utility nodes differently (smaller, diamond-like shape)
  if (isUtilityNode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="group relative"
        style={{ minWidth: `${minWidth}px`, maxWidth: `${maxWidth}px` }}
      >
        {/* Top Connection Handle */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Handle 
            type="target" 
            position={Position.Top} 
            className={`!w-6 !h-6 !rounded-full !border-2 transition-all ${getConnectionHandleClass(false)}`}
          />
        </div>

        {/* Utility Node - Clean Minimal Design */}
        <div
          className={`relative ${styles.bg} border transition-all duration-200 rounded-xl ${
            selected 
              ? `${styles.borderSelected} shadow-lg ring-2 ring-slate-200 ring-offset-1` 
              : `${styles.border} shadow-sm hover:shadow-md ${styles.borderHover}`
          }`}
        >
          {/* Delete Button - Shows on Hover */}
          {isHovered && !id.startsWith('day-marker-') && (
            <button
              onClick={handleDelete}
              className="absolute -top-2 -right-2 z-20 w-6 h-6 bg-slate-700 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-100"
              title="Delete node"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Content */}
          <div className="px-4 py-3.5">
            <div className="flex flex-col items-center gap-2.5">
              {/* Clean Icon */}
              <div className={`${styles.iconBg} p-2.5 rounded-lg transition-colors ${isHovered ? styles.iconBgHover : ''}`}>
                <Icon className="h-4 w-4 text-slate-700" />
              </div>
              
              {/* Text Content */}
              <div className="text-center">
                <div className="font-semibold text-sm text-slate-900 mb-1 truncate max-w-[140px]">
                  {data.label}
                </div>
                <div className={`text-[10px] ${styles.textSecondary} font-medium uppercase tracking-wider`}>
                  {data.type.toLowerCase().replace(/_/g, ' ')}
                </div>
              </div>

              {/* Details Badge */}
              {hasDetails && (
                <div className={`text-xs ${styles.text} px-2.5 py-1.5 ${styles.accent} rounded-lg border ${styles.border} font-medium truncate max-w-[160px]`}>
                  {nodeDetails}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Connection Point for Utility Nodes */}
          {(isCondition && branchCount > 0) || (isWeightedPath && pathCount > 0) ? (
            <div className={`border-t ${styles.border} pt-3 pb-2.5 px-3 ${styles.accent} mt-2`}>
            <div className="flex flex-wrap justify-center gap-2">
              {isCondition && branchCount > 0 ? (
                <>
                  {data.config.branches.map((branch: any, index: number) => {
                    const isConnected = !!branch.nextNodeId;
                    return (
                      <div key={branch.id} className="flex flex-col items-center gap-1.5">
                        <span className={`text-[10px] font-medium ${styles.text} px-2 py-0.5 ${styles.bg} rounded-md border ${styles.border} whitespace-nowrap shadow-sm`}>
                          {branch.label || `Branch ${index + 1}`}
                        </span>
                          <Handle
                            type="source"
                            position={Position.Bottom}
                            id={`branch-${branch.id}`}
                            className={`!w-6 !h-6 !-bottom-3 !rounded-full !border-2 transition-all ${getConnectionHandleClass(isConnected)}`}
                          />
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${styles.text} px-2 py-0.5 ${styles.bg} rounded-md border ${styles.border} whitespace-nowrap shadow-sm`}>
                      Default
                    </span>
                      <Handle
                        type="source"
                        position={Position.Bottom}
                        id="default"
                        className={`!w-6 !h-6 !-bottom-3 !rounded-full !border-2 transition-all ${getConnectionHandleClass(!!data.config.defaultBranch?.nextNodeId)}`}
                      />
                  </div>
                </>
              ) : isWeightedPath && pathCount > 0 ? (
                data.config.paths.map((path: any, index: number) => {
                  const isConnected = !!path.nextNodeId;
                  return (
                    <div key={path.id} className="flex flex-col items-center gap-1.5">
                      <span className={`text-[10px] font-medium ${styles.text} px-2 py-0.5 ${styles.bg} rounded-md border ${styles.border} whitespace-nowrap max-w-[100px] truncate shadow-sm`} title={`${path.label || `Path ${index + 1}`} (${path.percentage || 0}%)`}>
                        {path.label || `Path ${index + 1}`} ({path.percentage || 0}%)
                      </span>
                        <Handle
                          type="source"
                          position={Position.Bottom}
                          id={`path-${path.id}`}
                          className={`!w-6 !h-6 !-bottom-3 !rounded-full !border-2 transition-all ${getConnectionHandleClass(isConnected)}`}
                        />
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>
          ) : (
            <div className="pb-2.5 flex justify-center">
              <Handle 
                type="source" 
                position={Position.Bottom}
                className={`!w-6 !h-6 !-bottom-3 !rounded-full !border-2 transition-all ${getConnectionHandleClass(!!data.connections?.nextNodeId)}`} 
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Render action nodes (standard rectangular cards)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
      style={{ minWidth: `${minWidth}px`, maxWidth: `${maxWidth}px` }}
    >
      {/* Clean Top Connection Handle */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
        <Handle 
          type="target" 
          position={Position.Top} 
          className={`!w-7 !h-7 !rounded-full !border-2 transition-all ${getConnectionHandleClass(false)}`}
        />
      </div>

      {/* Elegant Node Card */}
      <div
        className={`relative rounded-xl ${styles.bg} border transition-all duration-300 ${
          selected 
            ? `${styles.borderSelected} shadow-xl ring-2 ring-slate-200 ring-offset-2` 
            : `${styles.border} shadow-sm hover:shadow-lg ${styles.borderHover}`
        }`}
      >
        {/* Delete Button - Shows on Hover */}
        {isHovered && !id.startsWith('day-marker-') && (
          <button
            onClick={handleDelete}
            className="absolute -top-2 -right-2 z-20 w-7 h-7 bg-slate-700 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-100"
            title="Delete node"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Content with Improved Spacing */}
        <div className="px-5 py-4.5">
          <div className="flex items-start gap-4 mb-3">
            {/* Clean Icon Container */}
            <div className={`${styles.iconBg} p-3 rounded-xl flex-shrink-0 transition-colors ${isHovered ? styles.iconBgHover : ''}`}>
              <Icon className="h-5 w-5 text-slate-700" />
            </div>
            
            {/* Text Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="font-semibold text-base text-slate-900 mb-1 truncate leading-tight">
                {data.label}
              </div>
              <div className={`text-xs ${styles.textSecondary} font-medium uppercase tracking-wider`}>
                {data.type.toLowerCase().replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          {/* Details Badge */}
          {hasDetails && (
            <div className={`text-sm ${styles.text} px-3 py-2 ${styles.accent} rounded-lg truncate border ${styles.border} mt-3 font-medium`}>
              {nodeDetails}
            </div>
          )}
        </div>

        {/* Connection Point Section for Action Nodes */}
        {(isCondition && branchCount > 0) || (isWeightedPath && pathCount > 0) ? (
          <div className={`border-t ${styles.border} pt-4 pb-3.5 px-4 ${styles.accent}`}>
            <div className="flex flex-wrap justify-center gap-2.5">
              {isCondition && branchCount > 0 ? (
                <>
                  {data.config.branches.map((branch: any, index: number) => {
                    const isConnected = !!branch.nextNodeId;
                    return (
                      <div key={branch.id} className="flex flex-col items-center gap-2">
                        <span className={`text-xs font-medium ${styles.text} px-2.5 py-1 ${styles.bg} rounded-md border ${styles.border} whitespace-nowrap shadow-sm`}>
                          {branch.label || `Branch ${index + 1}`}
                        </span>
                        <Handle
                          type="source"
                          position={Position.Bottom}
                          id={`branch-${branch.id}`}
                          className={`!w-7 !h-7 !-bottom-3.5 !rounded-full !border-2 transition-all ${getConnectionHandleClass(isConnected)}`}
                        />
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center gap-2">
                    <span className={`text-xs font-medium ${styles.text} px-2.5 py-1 ${styles.bg} rounded-md border ${styles.border} whitespace-nowrap shadow-sm`}>
                      Default
                    </span>
                    <Handle
                      type="source"
                      position={Position.Bottom}
                      id="default"
                      className={`!w-7 !h-7 !-bottom-3.5 !rounded-full !border-2 transition-all ${getConnectionHandleClass(!!data.config.defaultBranch?.nextNodeId)}`}
                    />
                  </div>
                </>
              ) : isWeightedPath && pathCount > 0 ? (
                data.config.paths.map((path: any, index: number) => {
                  const isConnected = !!path.nextNodeId;
                  return (
                    <div key={path.id} className="flex flex-col items-center gap-2">
                      <span className={`text-xs font-medium ${styles.text} px-2.5 py-1 ${styles.bg} rounded-md border ${styles.border} whitespace-nowrap max-w-[110px] truncate shadow-sm`} title={`${path.label || `Path ${index + 1}`} (${path.percentage || 0}%)`}>
                        {path.label || `Path ${index + 1}`} ({path.percentage || 0}%)
                      </span>
                      <Handle
                        type="source"
                        position={Position.Bottom}
                        id={`path-${path.id}`}
                        className={`!w-7 !h-7 !-bottom-3.5 !rounded-full !border-2 transition-all ${getConnectionHandleClass(isConnected)}`}
                      />
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>
        ) : (
          <div className="pb-3.5 flex justify-center">
            <Handle 
              type="source" 
              position={Position.Bottom}
              className={`!w-7 !h-7 !-bottom-3.5 !rounded-full !border-2 transition-all ${getConnectionHandleClass(!!data.connections?.nextNodeId)}`} 
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Custom Edge Component with Delete Button
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const reactFlowInstance = useReactFlow();
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    reactFlowInstance.deleteElements({ edges: [{ id }] });
  }, [id, reactFlowInstance]);
  
  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={labelStyle}
          className="react-flow__edge-text"
        >
          {label}
        </text>
      )}
      {isHovered && (
        <foreignObject
          x={labelX - 12}
          y={labelY - 12}
          width={24}
          height={24}
          className="overflow-visible pointer-events-auto"
        >
          <button
            onClick={handleDelete}
            className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-50 cursor-pointer"
            title="Delete connection"
          >
            <X className="w-4 h-4" />
          </button>
        </foreignObject>
      )}
    </g>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
  dayMarker: DayMarkerNode,
};

const edgeTypes = {
  default: CustomEdge,
  smoothstep: CustomEdge,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Journey Flow Component with Day Markers
function JourneyFlow(props: any) {
  const { collapsedDays, nodesByDayMap } = props;
  
  // Filter nodes based on collapsed days
  const visibleNodes = useMemo(() => {
    if (!collapsedDays || collapsedDays.size === 0) {
      return props.nodes;
    }
    
    const nodesByDay = nodesByDayMap || calculateNodesByDay(props.nodes, props.edges);
    const hiddenNodeIds = new Set<string>();
    
    collapsedDays.forEach((day: number) => {
      const dayNodes = nodesByDay.get(day) || [];
      dayNodes.forEach((node: Node) => {
        hiddenNodeIds.add(node.id);
      });
    });
    
    return props.nodes.filter((node: Node) => {
      // Always show day markers
      if (node.id.startsWith('day-marker-')) {
        // Hide day marker if its day is collapsed
        const dayMatch = node.id.match(/day-marker-(\d+)/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          return !collapsedDays.has(day);
        }
        return true;
      }
      return !hiddenNodeIds.has(node.id);
    });
  }, [props.nodes, props.edges, collapsedDays, nodesByDayMap]);
  
  // Filter edges based on visible nodes
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map((n: Node) => n.id));
    return props.edges.filter((edge: Edge) => {
      // Always show day marker edges if the day is visible
      if (edge.id.startsWith('day-marker-edge-')) {
        const dayMatch = edge.id.match(/day-marker-edge-(\d+)/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          return !collapsedDays.has(day);
        }
        return true;
      }
      return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
    });
  }, [props.edges, visibleNodes, collapsedDays]);
  
  return (
    <ReactFlow
      {...props}
      nodes={visibleNodes}
      edges={visibleEdges}
      fitView
      className="bg-white"
      defaultEdgeOptions={{
        type: 'smoothstep',
        animated: true,
        style: { 
          strokeWidth: 2.5,
          stroke: '#94a3b8',
        },
      }}
      connectionLineStyle={{
        strokeWidth: 2.5,
        stroke: '#94a3b8',
        strokeDasharray: '6,4',
      }}
      onConnectStart={props.onConnectStart}
      onConnectEnd={props.onConnectEnd}
      edgeTypes={props.edgeTypes}
    >
      {/* Refined Background */}
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={24} 
        size={1.2} 
        className="opacity-25"
        color="#cbd5e1"
      />
      
      {/* Day Markers */}
      <DayMarkers 
        nodes={props.nodes} 
        edges={props.edges} 
        setNodes={props.setNodes} 
        setEdges={props.setEdges}
        collapsedDays={collapsedDays}
      />
      
      {/* Refined Controls */}
      <Controls 
        className="bg-white border border-slate-200 rounded-lg shadow-md [&>button]:border-slate-200 [&>button]:hover:bg-slate-50 [&>button]:w-9 [&>button]:h-9 [&>button]:rounded-md" 
      />
    </ReactFlow>
  );
}

export default function NewJourneyPage() {
  const router = useRouter();
  const params = useParams();
  const editJourneyId = params?.id as string | undefined;
  
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [journeyName, setJourneyName] = useState('');
  const [journeyDescription, setJourneyDescription] = useState('');
  const [draggedNodeType, setDraggedNodeType] = useState<NodeType | null>(null);
  const [paletteSearchQuery, setPaletteSearchQuery] = useState('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [journeyId, setJourneyId] = useState<string | null>(editJourneyId || null);
  const [isLoadingJourney, setIsLoadingJourney] = useState(!!editJourneyId);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; handleId: string | null; position: { x: number; y: number } } | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [nodesByDayMap, setNodesByDayMap] = useState<Map<number, Node[]>>(new Map());
  const [showNodeSelector, setShowNodeSelector] = useState(false);
  const [nodeSelectorPosition, setNodeSelectorPosition] = useState<{ x: number; y: number } | null>(null);
  const [nodeSelectorContext, setNodeSelectorContext] = useState<'first-node' | 'connection' | null>(null);
  const [pendingConnectionTarget, setPendingConnectionTarget] = useState<{ sourceNodeId: string; handleId: string | null } | null>(null);
  
  // Update nodesByDayMap when nodes or edges change
  useEffect(() => {
    const calculated = calculateNodesByDay(nodes, edges);
    setNodesByDayMap(calculated);
  }, [nodes, edges]);
  
  const { data: campaigns = [] } = useCampaigns();
  const { data: templates = [] } = useTemplates();
  const { data: allJourneys = [] } = useJourneys();
  const { data: existingJourney, isLoading: journeyLoading } = useJourney(editJourneyId || '');
  const createJourney = useCreateJourney();
  const updateJourney = useUpdateJourney();
  const addNode = useAddJourneyNode();
  const updateNode = useUpdateJourneyNode();
  const deleteNode = useDeleteJourneyNode();
  
  // Custom handlers to save changes - positions are saved only when node is explicitly saved
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // Handle node deletions
      for (const change of changes) {
        if (change.type === 'remove') {
          const removedNode = nodes.find((n) => n.id === change.id);
          if (removedNode) {
            const removedNodeId = removedNode.id;
            
            // Clean up all edges connected to this node
            setEdges((eds) => eds.filter(
              (e) => e.source !== removedNodeId && e.target !== removedNodeId
            ));
            
            // Update all nodes that reference this deleted node
            setNodes((nds) => {
              return nds.map((node) => {
                if (node.id === removedNodeId) return node; // Skip the deleted node itself
                
                let updated = false;
                let updatedConfig = { ...node.data.config };
                let updatedConnections = { ...node.data.connections };
                
                // Check regular connections
                if (updatedConnections.nextNodeId === removedNodeId) {
                  updatedConnections.nextNodeId = undefined;
                  updated = true;
                }
                
                // Check output-based connections
                if (updatedConnections.outputs) {
                  const cleanedOutputs: Record<string, string | undefined> = {};
                  let outputsChanged = false;
                  Object.entries(updatedConnections.outputs).forEach(([output, targetId]) => {
                    if (targetId === removedNodeId) {
                      cleanedOutputs[output] = undefined;
                      outputsChanged = true;
                    } else if (typeof targetId === 'string') {
                      cleanedOutputs[output] = targetId;
                    }
                  });
                  if (outputsChanged) {
                    updatedConnections.outputs = cleanedOutputs;
                    updated = true;
                  }
                }
                
                // Check CONDITION node branches
                if (node.data.type === 'CONDITION') {
                  if (updatedConfig.branches) {
                    const updatedBranches = updatedConfig.branches.map((branch: any) => {
                      if (branch.nextNodeId === removedNodeId) {
                        updated = true;
                        return { ...branch, nextNodeId: undefined };
                      }
                      return branch;
                    });
                    if (updated) {
                      updatedConfig = { ...updatedConfig, branches: updatedBranches };
                    }
                  }
                  
                  if (updatedConfig.defaultBranch?.nextNodeId === removedNodeId) {
                    updatedConfig = {
                      ...updatedConfig,
                      defaultBranch: { ...updatedConfig.defaultBranch, nextNodeId: undefined },
                    };
                    updated = true;
                  }
                }
                
                // Check WEIGHTED_PATH node paths
                if (node.data.type === 'WEIGHTED_PATH' && updatedConfig.paths) {
                  const updatedPaths = updatedConfig.paths.map((path: any) => {
                    if (path.nextNodeId === removedNodeId) {
                      updated = true;
                      return { ...path, nextNodeId: undefined };
                    }
                    return path;
                  });
                  if (updated) {
                    updatedConfig = { ...updatedConfig, paths: updatedPaths };
                  }
                }
                
                if (updated) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      config: updatedConfig,
                      connections: updatedConnections,
                    },
                  };
                }
                
                return node;
              });
            });
            
            // Node deletion will be saved when user clicks Save
            // No immediate backend deletion - just update local state
          }
        }
      }
      
      // Apply ReactFlow's default changes
      onNodesChangeBase(changes);
      
      // Recalculate day attribution after node changes (deletions, replacements, etc.)
      // Use setTimeout to ensure state updates are applied first
      setTimeout(() => {
        setNodes((currentNodes) => {
          const calculatedDays = calculateNodesByDay(currentNodes, edges);
          return currentNodes.map((node) => {
            if (node.id.startsWith('day-marker-')) {
              return node;
            }
            
            // Find the day for this node
            let nodeDay: number | undefined = undefined;
            for (const [day, dayNodes] of calculatedDays.entries()) {
              if (dayNodes.some((n) => n.id === node.id)) {
                nodeDay = day;
                break;
              }
            }
            
            // Update day attribution if found
            if (nodeDay !== undefined) {
              const currentDay = node.data.config?.day || node.data.metadata?.day;
              if (currentDay !== nodeDay) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    config: {
                      ...node.data.config,
                      day: nodeDay,
                    },
                    metadata: {
                      ...(node.data.metadata || {}),
                      day: nodeDay,
                    },
                  },
                };
              }
            }
            
            return node;
          });
        });
      }, 0);
    },
    [onNodesChangeBase, nodes, setNodes, setEdges, edges],
  );

  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      // Apply ReactFlow's default changes first
      onEdgesChangeBase(changes);
      
      // Update local node state to reflect edge removals (no backend save until user clicks Save)
      for (const change of changes) {
        if (change.type === 'remove') {
          const removedEdge = edges.find((e) => e.id === change.id);
          if (removedEdge) {
            const sourceNode = nodes.find((n) => n.id === removedEdge.source);
            if (sourceNode) {
              let updatedConfig = { ...sourceNode.data.config };
              let connections = { ...(sourceNode.data.connections || {}) };

              // Handle CONDITION node branch edge removal
              if (sourceNode.data.type === 'CONDITION') {
                const branchMatch = removedEdge.id.match(/branch-([^-\s]+)/);
                if (branchMatch) {
                  const branchId = branchMatch[1];
                  updatedConfig = {
                    ...updatedConfig,
                    branches: (updatedConfig.branches || []).map((branch: any) =>
                      branch.id === branchId
                        ? { ...branch, nextNodeId: undefined }
                        : branch
                    ),
                  };
                } else if (removedEdge.id.includes('-default')) {
                  updatedConfig = {
                    ...updatedConfig,
                    defaultBranch: {
                      ...updatedConfig.defaultBranch,
                      nextNodeId: undefined,
                    },
                  };
                }
              }
              // Handle WEIGHTED_PATH node path edge removal
              else if (sourceNode.data.type === 'WEIGHTED_PATH') {
                const pathMatch = removedEdge.id.match(/path-([^-\s]+)/);
                if (pathMatch) {
                  const pathId = pathMatch[1];
                  updatedConfig = {
                    ...updatedConfig,
                    paths: (updatedConfig.paths || []).map((path: any) =>
                      path.id === pathId
                        ? { ...path, nextNodeId: undefined }
                        : path
                    ),
                  };
                }
              }
              // SIMPLIFIED: All nodes use single nextNodeId connection
              connections = {
                ...connections,
                nextNodeId: undefined,
              };

              // Update local node state only (no backend save)
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === sourceNode.id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          config: updatedConfig,
                          connections,
                        },
                      }
                    : node
                )
              );
            }
          }
        }
      }
      
      // Recalculate day attribution after edge changes (connections added/removed)
      // Use setTimeout to ensure state updates are applied first
      setTimeout(() => {
        setEdges((currentEdges) => {
          setNodes((currentNodes) => {
            const calculatedDays = calculateNodesByDay(currentNodes, currentEdges);
            return currentNodes.map((node) => {
              if (node.id.startsWith('day-marker-')) {
                return node;
              }
              
              // Find the day for this node
              let nodeDay: number | undefined = undefined;
              for (const [day, dayNodes] of calculatedDays.entries()) {
                if (dayNodes.some((n) => n.id === node.id)) {
                  nodeDay = day;
                  break;
                }
              }
              
              // Update day attribution if found
              if (nodeDay !== undefined) {
                const currentDay = node.data.config?.day || node.data.metadata?.day;
                if (currentDay !== nodeDay) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      config: {
                        ...node.data.config,
                        day: nodeDay,
                      },
                      metadata: {
                        ...(node.data.metadata || {}),
                        day: nodeDay,
                      },
                    },
                  };
                }
              }
              
              return node;
            });
          });
          return currentEdges;
        });
      }, 0);
    },
    [onEdgesChangeBase, edges, nodes, setNodes, setEdges],
  );
  
  const getNodeLabel = (config: any, type: NodeType): string => {
    switch (type) {
      case 'SEND_SMS':
        if (config.templateId) {
          return 'Send SMS (Template)';
        }
        return config.messageContent?.substring(0, 20) || 'Send SMS';
      case 'ADD_TO_CAMPAIGN':
        return config.campaignName ? `Add to ${config.campaignName}` : 'Add to Campaign';
      case 'REMOVE_FROM_CAMPAIGN':
        return config.campaignName ? `Remove from ${config.campaignName}` : 'Remove from Campaign';
      case 'EXECUTE_WEBHOOK':
        if (config.webhookUrl) {
          try {
            const url = new URL(config.webhookUrl);
            return `Webhook: ${url.hostname}`;
          } catch {
            return 'Execute Webhook';
          }
        }
        return 'Execute Webhook';
      case 'TIME_DELAY':
        if (config.delayAtTime) {
          return `Delay until ${config.delayAtTime}`;
        }
        return config.delayValue
          ? `Wait ${config.delayValue} ${config.delayUnit?.toLowerCase() || 'minutes'}`
          : 'Time Delay';
      case 'CONDITION':
        const branchCount = config.branches?.length || 0;
        return branchCount > 0 ? `Condition (${branchCount})` : 'Condition';
      case 'WEIGHTED_PATH':
        const pathCount = config.paths?.length || 0;
        return pathCount > 0 ? `Weighted Path (${pathCount})` : 'Weighted Path';
      case 'MAKE_CALL':
        if (config.audioFile) {
          return `Make Call (${config.audioFile})`;
        } else if (config.voiceTemplateId) {
          return 'Make Call (Voice Template)';
        }
        return 'Make Call (Not Configured)';
      default:
        return 'Node';
    }
  };
  
  // Load existing journey data when editing
  useEffect(() => {
    if (existingJourney && editJourneyId) {
      setJourneyId(existingJourney.id);
      setJourneyName(existingJourney.name);
      setJourneyDescription(existingJourney.description || '');
      
      // Load nodes from backend
      if (existingJourney.nodes && existingJourney.nodes.length > 0) {
        const loadedNodes: Node[] = existingJourney.nodes.map((node: any) => ({
          id: node.id,
          type: 'custom',
          position: { x: node.positionX, y: node.positionY },
          data: {
            type: node.type,
            label: getNodeLabel(node.config, node.type),
            config: node.config,
            metadata: node.metadata || (node.config?.day ? { day: node.config.day } : undefined),
          },
        }));
        
        // Only update nodes if the count changed (to avoid overwriting local deletions)
        // Check if nodes are actually different
        // Only update nodes if they've actually changed to avoid unnecessary re-renders
        setNodes((currentNodes) => {
          const currentNodeIds = new Set(currentNodes.map(n => n.id));
          const loadedNodeIds = new Set(loadedNodes.map(n => n.id));
          const nodesChanged = 
            currentNodeIds.size !== loadedNodeIds.size ||
            [...loadedNodeIds].some(id => !currentNodeIds.has(id)) ||
            [...currentNodeIds].some(id => !loadedNodeIds.has(id));
          
          return nodesChanged ? loadedNodes : currentNodes;
        });
        
        // Build edges from node connections
        const loadedEdges: Edge[] = [];
        const nodeMap = new Map(loadedNodes.map(n => [n.id, n]));
        
        existingJourney.nodes.forEach((node: any) => {
          const sourceId = node.id;
          
          // SIMPLIFIED: All nodes use single nextNodeId connection
          // Check direct connection (connections.nextNodeId)
          if (node.connections?.nextNodeId && nodeMap.has(node.connections.nextNodeId)) {
            loadedEdges.push({
              id: `edge-${sourceId}-${node.connections.nextNodeId}`,
              source: sourceId,
              target: node.connections.nextNodeId,
              type: 'smoothstep',
              animated: true,
              style: { 
                strokeWidth: 2, 
                stroke: '#94a3b8',
              },
            });
          }
          
          // Check CONDITION node branches
          if (node.type === 'CONDITION' && node.config?.branches) {
            node.config.branches.forEach((branch: any) => {
              if (branch.nextNodeId && nodeMap.has(branch.nextNodeId)) {
                loadedEdges.push({
                  id: `edge-${sourceId}-${branch.nextNodeId}-branch-${branch.id}`,
                  source: sourceId,
                  sourceHandle: `branch-${branch.id}`,
                  target: branch.nextNodeId,
                  type: 'smoothstep',
                  animated: true,
                  style: { 
                    strokeWidth: 2, 
                    stroke: '#94a3b8',
                  },
                  label: branch.label || '',
                  labelStyle: { fill: '#64748b', fontWeight: 500 },
                });
              }
            });
            // Default branch
            if (node.config.defaultBranch?.nextNodeId && nodeMap.has(node.config.defaultBranch.nextNodeId)) {
              loadedEdges.push({
                id: `edge-${sourceId}-${node.config.defaultBranch.nextNodeId}-default`,
                source: sourceId,
                sourceHandle: 'default',
                target: node.config.defaultBranch.nextNodeId,
                type: 'smoothstep',
                animated: true,
                style: { 
                  strokeWidth: 2, 
                  stroke: '#94a3b8',
                },
                label: 'Default',
                labelStyle: { fill: '#64748b', fontWeight: 500 },
              });
            }
          }
          
          // Check WEIGHTED_PATH node paths
          if (node.type === 'WEIGHTED_PATH' && node.config?.paths) {
            node.config.paths.forEach((path: any) => {
              if (path.nextNodeId && nodeMap.has(path.nextNodeId)) {
                loadedEdges.push({
                  id: `edge-${sourceId}-${path.nextNodeId}-path-${path.id}`,
                  source: sourceId,
                  sourceHandle: `path-${path.id}`,
                  target: path.nextNodeId,
                  type: 'smoothstep',
                  animated: true,
                  style: { 
                    strokeWidth: 2, 
                    stroke: '#94a3b8',
                  },
                  label: `${path.label || ''} (${path.percentage}%)`,
                  labelStyle: { fill: '#64748b', fontWeight: 500 },
                });
              }
            });
          }
        });
        
        setEdges(loadedEdges);
      } else {
        // No nodes in backend - clear local nodes
        setNodes([]);
        setEdges([]);
      }
      setIsLoadingJourney(false);
    } else if (!editJourneyId) {
      setIsLoadingJourney(false);
    }
  }, [existingJourney, editJourneyId, setNodes, setEdges]); // nodes intentionally excluded to prevent infinite loop

  const onConnect = useCallback(
    (params: Connection) => {
      // Clear connection start popup when connection is made
      setConnectionStart(null);
      connectionStartRef.current = null;
      
      // Always allow connections in the UI - save will happen when user clicks Save
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        
        // Recalculate day attribution after connection is made
        setTimeout(() => {
          setNodes((currentNodes) => {
            const calculatedDays = calculateNodesByDay(currentNodes, newEdges);
            return currentNodes.map((node) => {
              if (node.id.startsWith('day-marker-')) {
                return node;
              }
              
              // Find the day for this node
              let nodeDay: number | undefined = undefined;
              for (const [day, dayNodes] of calculatedDays.entries()) {
                if (dayNodes.some((n) => n.id === node.id)) {
                  nodeDay = day;
                  break;
                }
              }
              
              // Update day attribution if found
              if (nodeDay !== undefined) {
                const currentDay = node.data.config?.day || node.data.metadata?.day;
                if (currentDay !== nodeDay) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      config: {
                        ...node.data.config,
                        day: nodeDay,
                      },
                      metadata: {
                        ...(node.data.metadata || {}),
                        day: nodeDay,
                      },
                    },
                  };
                }
              }
              
              return node;
            });
          });
        }, 0);
        
        return newEdges;
      });
      
      // Update local node state to reflect the connection (for UI consistency)
      const sourceNode = nodes.find(n => n.id === params.source);
      if (sourceNode) {
        let updatedConfig = { ...sourceNode.data.config };
        let connections = { ...(sourceNode.data.connections || {}) };

        // Handle CONDITION node branch connections
        if (sourceNode.data.type === 'CONDITION' && params.sourceHandle) {
          if (params.sourceHandle.startsWith('branch-')) {
            const branchId = params.sourceHandle.replace('branch-', '');
            updatedConfig = {
              ...updatedConfig,
              branches: (updatedConfig.branches || []).map((branch: any) =>
                branch.id === branchId
                  ? { ...branch, nextNodeId: params.target || undefined }
                  : branch
              ),
            };
          } else if (params.sourceHandle === 'default') {
            updatedConfig = {
              ...updatedConfig,
              defaultBranch: {
                ...updatedConfig.defaultBranch,
                nextNodeId: params.target || undefined,
              },
            };
          }
        }
        // Handle WEIGHTED_PATH node path connections
        else if (sourceNode.data.type === 'WEIGHTED_PATH' && params.sourceHandle) {
          if (params.sourceHandle.startsWith('path-')) {
            const pathId = params.sourceHandle.replace('path-', '');
            updatedConfig = {
              ...updatedConfig,
              paths: (updatedConfig.paths || []).map((path: any) =>
                path.id === pathId
                  ? { ...path, nextNodeId: params.target || undefined }
                  : path
              ),
            };
          }
        }
        // SIMPLIFIED: All nodes use single nextNodeId connection
        connections = {
          ...connections,
          nextNodeId: params.target || undefined,
        };

        // Update local node state only (no backend save)
        setNodes((nds) =>
          nds.map((node) =>
            node.id === sourceNode.id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    config: updatedConfig,
                    connections,
                  },
                }
              : node
          )
        );
      }
    },
    [setEdges, nodes, setNodes],
  );

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    setDraggedNodeType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - (reactFlowBounds?.left || 0),
        y: event.clientY - (reactFlowBounds?.top || 0),
      });

      // If no node type is being dragged, check if canvas is empty and show node selector
      const journeyNodes = nodes.filter(n => !n.id.startsWith('day-marker-'));
      if (!draggedNodeType && journeyNodes.length === 0) {
        setNodeSelectorPosition({ x: event.clientX, y: event.clientY });
        setNodeSelectorContext('first-node');
        setShowNodeSelector(true);
        return;
      }

      if (!draggedNodeType) return;

      const initialConfig: any = {};
      if (draggedNodeType === 'CONDITION') {
        initialConfig.branches = [];
        initialConfig.defaultBranch = {};
      } else if (draggedNodeType === 'WEIGHTED_PATH') {
        initialConfig.paths = [
          { id: `path_${Date.now()}_1`, label: 'Path A', percentage: 50, nextNodeId: '' },
          { id: `path_${Date.now()}_2`, label: 'Path B', percentage: 50, nextNodeId: '' },
        ];
      } else if (draggedNodeType === 'TIME_DELAY') {
        // Set default values so delay node is usable immediately
        initialConfig.delayValue = 1;
        initialConfig.delayUnit = 'MINUTES';
        initialConfig.delayAtTime = undefined;
      }

      const newNode: Node = {
        id: `${draggedNodeType}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          type: draggedNodeType,
          label: getNodeLabel(initialConfig, draggedNodeType),
          config: initialConfig,
        },
      };

      // Add node to state first, then handle connections
      setNodes((nds) => {
        // Filter out day markers to avoid conflicts
        const journeyNodes = nds.filter(n => !n.id.startsWith('day-marker-'));
        const updatedNodes = [...journeyNodes, newNode];
        
        // Handle auto-connections after a short delay to ensure node is in state
        setTimeout(() => {
          if (updatedNodes.length > 1) {
            // Find the node that's closest above the drop position
            const existingNodes = updatedNodes.slice(0, -1);
            const dropY = position.y;
            
            // Filter nodes that are above the drop position (have lower Y coordinate)
            const nodesAbove = existingNodes.filter(node => node.position.y < dropY);
            
            if (nodesAbove.length > 0) {
              // Find the closest node above (smallest Y difference)
              const closestNodeAbove = nodesAbove.reduce((closest, node) => {
                const closestDiff = dropY - closest.position.y;
                const nodeDiff = dropY - node.position.y;
                return nodeDiff < closestDiff ? node : closest;
              });
              
              if (closestNodeAbove && closestNodeAbove.id !== newNode.id) {
                // Create edge from the closest node above to new node
                const newEdge: Edge = {
                  id: `edge-${closestNodeAbove.id}-${newNode.id}`,
                  source: closestNodeAbove.id,
                  target: newNode.id,
                  type: 'smoothstep',
                  animated: true,
                  style: { 
                    strokeWidth: 2, 
                    stroke: '#94a3b8',
                  },
                };
                setEdges((eds) => {
                  // Check if edge already exists
                  const exists = eds.some(e => e.source === closestNodeAbove.id && e.target === newNode.id);
                  return exists ? eds : addEdge(newEdge, eds);
                });
              }
            } else if (existingNodes.length > 0) {
              // If no nodes above, connect to the last node (fallback behavior)
              const lastNode = existingNodes[existingNodes.length - 1];
              if (lastNode && lastNode.id !== newNode.id) {
                const newEdge: Edge = {
                  id: `edge-${lastNode.id}-${newNode.id}`,
                  source: lastNode.id,
                  target: newNode.id,
                  type: 'smoothstep',
                  animated: true,
                  style: { 
                    strokeWidth: 2, 
                    stroke: '#94a3b8',
                  },
                };
                setEdges((eds) => {
                  const exists = eds.some(e => e.source === lastNode.id && e.target === newNode.id);
                  return exists ? eds : addEdge(newEdge, eds);
                });
              }
            }
          }
        }, 0);
        
        return updatedNodes;
      });
      setDraggedNodeType(null);
    },
    [reactFlowInstance, draggedNodeType, nodes, setNodes, setEdges],
  );

  const createNodeAtPosition = useCallback((nodeType: NodeType, position: { x: number; y: number }): Node => {
    const initialConfig: any = {};
    if (nodeType === 'CONDITION') {
      initialConfig.branches = [];
      initialConfig.defaultBranch = {};
    } else if (nodeType === 'WEIGHTED_PATH') {
      initialConfig.paths = [
        { id: `path_${Date.now()}_1`, label: 'Path A', percentage: 50, nextNodeId: '' },
        { id: `path_${Date.now()}_2`, label: 'Path B', percentage: 50, nextNodeId: '' },
      ];
    } else if (nodeType === 'TIME_DELAY') {
      initialConfig.delayValue = 1;
      initialConfig.delayUnit = 'MINUTES';
      initialConfig.delayAtTime = undefined;
    }

    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: 'custom',
      position,
      data: {
        type: nodeType,
        label: getNodeLabel(initialConfig, nodeType),
        config: initialConfig,
      },
    };

    setNodes((nds) => {
      const journeyNodes = nds.filter(n => !n.id.startsWith('day-marker-'));
      return [...journeyNodes, newNode];
    });

    return newNode;
  }, [setNodes]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  }, []);

  const connectionStartRef = useRef<{ nodeId: string; handleId: string | null; position: { x: number; y: number } } | null>(null);

  const onConnectStart = useCallback((event: any, params: { nodeId: string; handleId: string | null }) => {
    // Store connection start info for potential popup (only show if connection fails)
    if (reactFlowInstance && reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      connectionStartRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId,
        position,
      };
    }
  }, [reactFlowInstance]);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    // If connection ended without connecting to a target, show node selector
    // onConnect will clear connectionStartRef if connection succeeds
    if (connectionStartRef.current) {
      // Small delay to ensure onConnect has had a chance to clear it if connection succeeded
      setTimeout(() => {
        if (connectionStartRef.current) {
          const clientX = 'clientX' in event ? event.clientX : 0;
          const clientY = 'clientY' in event ? event.clientY : 0;
          setNodeSelectorPosition({ x: clientX, y: clientY });
          setPendingConnectionTarget({
            sourceNodeId: connectionStartRef.current.nodeId,
            handleId: connectionStartRef.current.handleId,
          });
          setNodeSelectorContext('connection');
          setShowNodeSelector(true);
          setConnectionStart(null);
        }
      }, 50);
    }
  }, []);

  const handleSelectNodeForConnection = useCallback((targetNodeId: string) => {
    if (!connectionStart) return;

    const sourceNode = nodes.find(n => n.id === connectionStart.nodeId);
    if (!sourceNode) return;

    // Create connection params
    const connectionParams: Connection = {
      source: connectionStart.nodeId,
      target: targetNodeId,
      sourceHandle: connectionStart.handleId || null,
      targetHandle: null,
    };

    // Clear connection start refs before connecting
    connectionStartRef.current = null;
    setConnectionStart(null);

    // Use the existing onConnect handler
    onConnect(connectionParams);
  }, [connectionStart, nodes, onConnect]);

  const updateNodeConfig = async (config: any) => {
    if (!selectedNode) return;
    
    try {
      // No backend operations - just update local state
      // Journey creation and node saving happens on "Save Draft" or "Launch"
      
      // Check if this is a TIME_DELAY node and delayValue/delayUnit changed
      const isTimeDelayNode = selectedNode.data.type === 'TIME_DELAY';
      const delayValueChanged = isTimeDelayNode && 
        (selectedNode.data.config?.delayValue !== config.delayValue || 
         selectedNode.data.config?.delayUnit !== config.delayUnit);
      
      // Ensure numberPoolId is explicitly included (even if undefined) for SEND_SMS nodes
      const configToSave = { ...config };
      if (selectedNode.data.type === 'SEND_SMS') {
        // Explicitly include numberPoolId - undefined means use default, empty string should be undefined
        if (configToSave.numberPoolId === '') {
          configToSave.numberPoolId = undefined;
        }
      }
      
      // Remove connections from configToSave if it was included (connections are handled separately)
      const { connections: configConnections, ...configWithoutConnections } = configToSave;
      
      // SIMPLIFIED: All nodes use single nextNodeId connection (except CONDITION/WEIGHTED_PATH)
      // Get the latest connections from node state
      const currentNode = nodes.find((n) => n.id === selectedNode.id);
      let connections: any = currentNode?.data.connections 
        ? { ...currentNode.data.connections } 
        : (selectedNode.data.connections ? { ...selectedNode.data.connections } : {});
      
      // CONDITION and WEIGHTED_PATH nodes handle connections via config.branches/paths
      if (selectedNode.data.type === 'CONDITION') {
        // For condition nodes, sync branches and defaultBranch from edges
        // But preserve the config structure - don't modify connections
        // The branches/defaultBranch are already in config, just ensure they're synced with edges
        if (config.branches) {
          config.branches = config.branches.map((branch: any) => {
            const edge = edges.find((e) => e.source === selectedNode.id && e.sourceHandle === `branch-${branch.id}`);
            if (edge && edge.target) {
              return { ...branch, nextNodeId: edge.target };
            }
            return branch;
          });
        }
        if (config.defaultBranch) {
          const defaultEdge = edges.find((e) => e.source === selectedNode.id && e.sourceHandle === 'default');
          if (defaultEdge && defaultEdge.target) {
            config.defaultBranch = { ...config.defaultBranch, nextNodeId: defaultEdge.target };
          }
        }
        // Don't modify connections for CONDITION nodes - they use config.branches/defaultBranch
      } else if (selectedNode.data.type === 'WEIGHTED_PATH') {
        // For weighted path nodes, sync paths from edges
        if (config.paths) {
          config.paths = config.paths.map((path: any) => {
            const edge = edges.find((e) => e.source === selectedNode.id && e.sourceHandle === `path-${path.id}`);
            if (edge && edge.target) {
              return { ...path, nextNodeId: edge.target };
            }
            return path;
          });
        }
        // Don't modify connections for WEIGHTED_PATH nodes - they use config.paths
      } else {
        // SIMPLIFIED: All nodes use single nextNodeId connection
        const outgoingEdge = edges.find((e) => e.source === selectedNode.id);
        if (outgoingEdge?.target) {
          connections.nextNodeId = outgoingEdge.target;
        } else {
          connections.nextNodeId = undefined;
        }
      }
      
      // For CONDITION and WEIGHTED_PATH nodes, ensure config includes updated branches/paths
      const finalConfig = selectedNode.data.type === 'CONDITION' || selectedNode.data.type === 'WEIGHTED_PATH'
        ? { ...configWithoutConnections, ...config } // Merge to ensure branches/paths are included
        : configWithoutConnections;
      
      // Update local state only - backend save happens on "Save Draft" or "Launch"
      setNodes((nds) => {
        const updatedNodes = nds.map((node) =>
          node.id === selectedNode.id
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  config: finalConfig, 
                  connections,
                  label: getNodeLabel(finalConfig, selectedNode.data.type) 
                } 
              }
            : node,
        );
        
        // Recalculate day attribution if TIME_DELAY delayValue/delayUnit changed
        // or if any node config that affects day calculation changed
        if (delayValueChanged || isTimeDelayNode) {
          setTimeout(() => {
            setEdges((currentEdges) => {
              const calculatedDays = calculateNodesByDay(updatedNodes, currentEdges);
              setNodes((currentNodes) => {
                return currentNodes.map((node) => {
                  if (node.id.startsWith('day-marker-')) {
                    return node;
                  }
                  
                  // Find the day for this node
                  let nodeDay: number | undefined = undefined;
                  for (const [day, dayNodes] of calculatedDays.entries()) {
                    if (dayNodes.some((n) => n.id === node.id)) {
                      nodeDay = day;
                      break;
                    }
                  }
                  
                  // Update day attribution if found
                  if (nodeDay !== undefined) {
                    const currentDay = node.data.config?.day || node.data.metadata?.day;
                    if (currentDay !== nodeDay) {
                      return {
                        ...node,
                        data: {
                          ...node.data,
                          config: {
                            ...node.data.config,
                            day: nodeDay,
                          },
                          metadata: {
                            ...(node.data.metadata || {}),
                            day: nodeDay,
                          },
                        },
                      };
                    }
                  }
                  
                  return node;
                });
              });
              return currentEdges;
            });
          }, 0);
        }
        
        return updatedNodes;
      });
      
      setShowNodeConfig(false);
      setSelectedNode(null);
      toast.success('Node configuration updated (will be saved when you click Save Draft or Launch)');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save node');
    }
  };

  // Validation function for nodes
  const validateNode = (node: Node): string | null => {
    const config = node.data.config || {};
    
    switch (node.data.type) {
      case 'SEND_SMS':
        if (!config.messageContent && !config.templateId && !config.contentAiTemplateId) {
          return 'SMS node must have message content, template, or Content AI template';
        }
        break;
      case 'ADD_TO_CAMPAIGN':
      case 'REMOVE_FROM_CAMPAIGN':
        if (!config.campaignId) {
          return `${node.data.type.replace(/_/g, ' ')} node must have a campaign selected`;
        }
        break;
      case 'EXECUTE_WEBHOOK':
        if (!config.webhookUrl && !config.webhookId) {
          return 'Webhook node must have a webhook URL or webhook selected';
        }
        if (config.webhookBody) {
          try {
            JSON.parse(config.webhookBody);
          } catch {
            return 'Webhook body must be valid JSON';
          }
        }
        break;
      case 'TIME_DELAY':
        if (!config.delayAtTime && (!config.delayValue || config.delayValue <= 0)) {
          return 'Time delay node must have a delay value or specific time';
        }
        if (!config.delayAtTime && !config.delayUnit) {
          return 'Time delay node must have a delay unit';
        }
        break;
      case 'CONDITION':
        if (!config.branches || config.branches.length === 0) {
          return 'Condition node must have at least one branch';
        }
        for (const branch of config.branches || []) {
          if (!branch.condition?.field || !branch.condition?.operator) {
            return 'All condition branches must have a field and operator';
          }
          if (branch.condition.operator !== 'exists' && branch.condition.operator !== 'not_exists' && !branch.condition.value) {
            return `Branch "${branch.label || branch.id}" must have a value`;
          }
        }
        break;
      case 'WEIGHTED_PATH':
        if (!config.paths || config.paths.length < 2) {
          return 'Weighted path node must have at least 2 paths';
        }
        const totalPercentage = (config.paths || []).reduce((sum: number, p: any) => sum + (p.percentage || 0), 0);
        if (totalPercentage !== 100) {
          return `Weighted path percentages must total 100% (currently ${totalPercentage}%)`;
        }
        break;
      case 'MAKE_CALL':
        if (!config.audioFile && !config.voiceTemplateId && !config.journeyAudioId) {
          return 'Make call node must have an audio file, voice template, or journey audio';
        }
        break;
      case 'UPDATE_CONTACT_STATUS':
        if (!config.leadStatus) {
          return 'Update contact status node must have a lead status selected';
        }
        break;
    }
    return null;
  };

  // Build connections from edges for a node
  const buildConnectionsFromEdges = (nodeId: string): any => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return {};
    
    const connections: any = {};
    
    // Handle CONDITION nodes - connections are in config.branches/defaultBranch
    if (node.data.type === 'CONDITION') {
      // Connections are already in config, just return empty connections object
      return {};
    }
    
    // Handle WEIGHTED_PATH nodes - connections are in config.paths
    if (node.data.type === 'WEIGHTED_PATH') {
      // Connections are already in config, just return empty connections object
      return {};
    }
    
    // SIMPLIFIED: All nodes use single nextNodeId connection (except CONDITION/WEIGHTED_PATH)
    // Find the outgoing edge (single connection point)
    const outgoingEdge = edges.find((e) => e.source === nodeId);
    if (outgoingEdge?.target) {
      connections.nextNodeId = outgoingEdge.target;
    }
    
    return connections;
  };

  const handleSaveDraft = async () => {
    if (!journeyName) {
      toast.error('Please enter a journey name');
      return;
    }

    // Filter out day marker nodes
    const journeyNodes = nodes.filter(n => !n.id.startsWith('day-marker-'));
    
    // Validate all nodes
    const validationErrors: string[] = [];
    for (const node of journeyNodes) {
      const error = validateNode(node);
      if (error) {
        validationErrors.push(`${node.data.type.replace(/_/g, ' ')} node: ${error}`);
      }
    }
    
    if (validationErrors.length > 0) {
      toast.error(`Validation failed:\n${validationErrors.join('\n')}`);
      return;
    }

    try {
      let currentJourneyId = journeyId;
      
      // Create journey if it doesn't exist
      if (!currentJourneyId) {
        const journey = await createJourney.mutateAsync({
          name: journeyName,
          description: journeyDescription,
          status: 'DRAFT',
        });
        currentJourneyId = journey.id;
        setJourneyId(journey.id);
      } else {
        // Update journey metadata
        await updateJourney.mutateAsync({
          id: currentJourneyId,
          data: {
            name: journeyName,
            description: journeyDescription,
          },
        });
      }

      // Track nodes to delete (backend nodes that are no longer in the UI)
      const backendNodeIds = new Set<string>();
      const currentBackendNodes = journeyNodes
        .filter(n => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n.id))
        .map(n => n.id);
      
      // Get all backend nodes for this journey to find ones to delete
      if (existingJourney?.nodes) {
        existingJourney.nodes.forEach((backendNode: any) => {
          if (!currentBackendNodes.includes(backendNode.id)) {
            backendNodeIds.add(backendNode.id);
          }
        });
      }

      // Delete nodes that were removed from UI
      for (const nodeIdToDelete of backendNodeIds) {
        await deleteNode.mutateAsync({
          journeyId: currentJourneyId,
          nodeId: nodeIdToDelete,
        });
      }

      // Save all nodes (create new ones, update existing ones)
      for (const node of journeyNodes) {
        const isBackendNode = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.id);
        
        // Build connections from edges
        const connections = buildConnectionsFromEdges(node.id);
        
        // For CONDITION and WEIGHTED_PATH nodes, connections are in config
        const nodeConfig = node.data.type === 'CONDITION' || node.data.type === 'WEIGHTED_PATH'
          ? node.data.config // Config already has branches/paths with nextNodeId
          : node.data.config;
        
        if (isBackendNode) {
          // Update existing node
          await updateNode.mutateAsync({
            journeyId: currentJourneyId,
            nodeId: node.id,
            node: {
              type: node.data.type,
              config: nodeConfig,
              positionX: node.position.x,
              positionY: node.position.y,
              connections,
            },
          });
        } else {
          // Create new node
          const newNode = await addNode.mutateAsync({
            journeyId: currentJourneyId,
            node: {
              type: node.data.type,
              config: nodeConfig,
              positionX: node.position.x,
              positionY: node.position.y,
              connections,
            },
          });
          
          // Update local node ID and all references
          const oldNodeId = node.id;
          const newNodeId = newNode.id;
          
          // Update node ID in local state
          setNodes((nds) =>
            nds.map((n) =>
              n.id === oldNodeId ? { ...n, id: newNodeId } : n
            )
          );
          
          // Update edges to use new node ID
          setEdges((eds) =>
            eds.map((edge) =>
              edge.source === oldNodeId
                ? { ...edge, source: newNodeId }
                : edge.target === oldNodeId
                ? { ...edge, target: newNodeId }
                : edge
            )
          );
          
          // Update all other nodes that reference this node
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === oldNodeId) return n;
              
              let updatedConfig = { ...n.data.config };
              let updatedConnections = { ...n.data.connections };
              let needsUpdate = false;
              
              // Update regular connections
              if (n.data.connections?.nextNodeId === oldNodeId) {
                updatedConnections = { ...updatedConnections, nextNodeId: newNodeId };
                needsUpdate = true;
              }
              
              // Update output-based connections
              if (n.data.connections?.outputs) {
                const updatedOutputs: Record<string, string | undefined> = { ...n.data.connections.outputs };
                let outputsUpdated = false;
                for (const [outputKey, outputNodeId] of Object.entries(updatedOutputs)) {
                  if (outputNodeId === oldNodeId) {
                    updatedOutputs[outputKey] = newNodeId;
                    outputsUpdated = true;
                    needsUpdate = true;
                  }
                }
                if (outputsUpdated) {
                  updatedConnections = { ...updatedConnections, outputs: updatedOutputs };
                }
              }
              
              // Update CONDITION node branches
              if (n.data.type === 'CONDITION' && n.data.config?.branches) {
                updatedConfig = {
                  ...updatedConfig,
                  branches: n.data.config.branches.map((branch: any) => {
                    if (branch.nextNodeId === oldNodeId) {
                      needsUpdate = true;
                      return { ...branch, nextNodeId: newNodeId };
                    }
                    return branch;
                  }),
                };
              }
              
              // Update CONDITION node default branch
              if (n.data.type === 'CONDITION' && n.data.config?.defaultBranch?.nextNodeId === oldNodeId) {
                updatedConfig = {
                  ...updatedConfig,
                  defaultBranch: {
                    ...n.data.config.defaultBranch,
                    nextNodeId: newNodeId,
                  },
                };
                needsUpdate = true;
              }
              
              // Update WEIGHTED_PATH node paths
              if (n.data.type === 'WEIGHTED_PATH' && n.data.config?.paths) {
                updatedConfig = {
                  ...updatedConfig,
                  paths: n.data.config.paths.map((path: any) => {
                    if (path.nextNodeId === oldNodeId) {
                      needsUpdate = true;
                      return { ...path, nextNodeId: newNodeId };
                    }
                    return path;
                  }),
                };
              }
              
              if (needsUpdate) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    config: updatedConfig,
                    connections: updatedConnections,
                  },
                };
              }
              
              return n;
            })
          );
        }
      }

      toast.success('Journey saved as draft');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save journey');
    }
  };

  const handleCleanLayout = () => {
    // Filter out day marker nodes for layout calculation
    const journeyNodes = nodes.filter(n => !n.id.startsWith('day-marker-'));
    if (journeyNodes.length === 0) {
      toast.error('No nodes to organize');
      return;
    }

    // Layout constants: days arranged horizontally (side by side)
    const VERTICAL_SPACING = 200; // Spacing between nodes within a day column
    const DAY_COLUMN_WIDTH = 400; // Width of each day column
    const DAY_COLUMN_SPACING = 100; // Spacing between day columns
    const START_X = 200;
    const START_Y = 100;
    
    // Filter edges to exclude day marker edges
    const journeyEdges = edges.filter(e => !e.id.startsWith('day-marker-edge-'));

    // Build node map for quick lookup
    const nodeMap = new Map<string, typeof journeyNodes[0]>();
    journeyNodes.forEach(node => nodeMap.set(node.id, node));

    // Infer days using the same logic as DayMarkers component
    const nodeDayMap = new Map<string, number>();
    const nodesByDay = new Map<number, string[]>();
    
    // Step 1: Check for explicit day in config/metadata
    journeyNodes.forEach(node => {
      const day = node.data.config?.day || node.data.metadata?.day;
      if (day !== undefined && typeof day === 'number') {
        nodeDayMap.set(node.id, day);
        if (!nodesByDay.has(day)) {
          nodesByDay.set(day, []);
        }
        nodesByDay.get(day)!.push(node.id);
      }
    });

    // Step 2: If nodes don't have explicit days, infer from TIME_DELAY nodes
    if (nodeDayMap.size < journeyNodes.length) {
      // Find root nodes (nodes with no incoming edges)
      const rootNodes = journeyNodes.filter(node => {
        return !journeyEdges.some(e => e.target === node.id);
      });
      
      // If no root nodes, use first node
      const startNodes = rootNodes.length > 0 ? rootNodes : [journeyNodes[0]];
      const currentDay = 1;
      
      // BFS traversal to assign days based on TIME_DELAY nodes
      const queue: Array<{ nodeId: string; day: number }> = startNodes.map(n => ({ nodeId: n.id, day: currentDay }));
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const { nodeId, day } = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        
        const node = nodeMap.get(nodeId);
        if (!node) continue;
        
        // Assign day to this node if not already assigned
        if (!nodeDayMap.has(nodeId)) {
          nodeDayMap.set(nodeId, day);
          if (!nodesByDay.has(day)) {
            nodesByDay.set(day, []);
          }
          nodesByDay.get(day)!.push(nodeId);
        }
        
        // Check if this is a TIME_DELAY node with DAYS unit
        let dayIncrement = 0;
        if (node.data.type === 'TIME_DELAY' && node.data.config?.delayUnit === 'DAYS') {
          dayIncrement = node.data.config.delayValue || 0;
        }
        
        const nextDay = day + dayIncrement;
        
        // Find next nodes from edges
        const nextNodeIds = journeyEdges
          .filter(e => e.source === nodeId)
          .map(e => e.target);
        
        // Also check node connections
        if (node.data.connections?.nextNodeId) {
          nextNodeIds.push(node.data.connections.nextNodeId);
        }
        if (node.data.connections?.outputs) {
          nextNodeIds.push(...Object.values(node.data.connections.outputs).filter((id): id is string => typeof id === 'string'));
        }
        if (node.data.type === 'CONDITION' && node.data.config?.branches) {
          node.data.config.branches.forEach((b: any) => {
            if (b.nextNodeId) nextNodeIds.push(b.nextNodeId);
          });
          if (node.data.config.defaultBranch?.nextNodeId) {
            nextNodeIds.push(node.data.config.defaultBranch.nextNodeId);
          }
        }
        if (node.data.type === 'WEIGHTED_PATH' && node.data.config?.paths) {
          node.data.config.paths.forEach((p: any) => {
            if (p.nextNodeId) nextNodeIds.push(p.nextNodeId);
          });
        }
        
        // Add next nodes to queue
        nextNodeIds.forEach(nextId => {
          if (!visited.has(nextId) && nodeMap.has(nextId)) {
            queue.push({ nodeId: nextId, day: nextDay });
          }
        });
      }
      
      // Assign remaining unvisited nodes to day 1
      journeyNodes.forEach(node => {
        if (!nodeDayMap.has(node.id)) {
          nodeDayMap.set(node.id, 1);
          if (!nodesByDay.has(1)) {
            nodesByDay.set(1, []);
          }
          nodesByDay.get(1)!.push(node.id);
        }
      });
    }

    // Build graph structure from edges
    const nodeGraph = new Map<string, string[]>();
    for (const node of journeyNodes) {
      const children = journeyEdges
        .filter(e => e.source === node.id)
        .map(e => e.target);
      nodeGraph.set(node.id, children);
    }

    // Calculate positions: arrange days horizontally (side by side)
    const positions = new Map<string, { x: number; y: number }>();
    const sortedDays = Array.from(nodesByDay.keys()).sort((a, b) => a - b);
    
    // Safety check: if no days found, assign all nodes to day 1
    if (sortedDays.length === 0) {
      console.warn('No days found, assigning all nodes to day 1');
      for (const node of journeyNodes) {
        nodeDayMap.set(node.id, 1);
        if (!nodesByDay.has(1)) {
          nodesByDay.set(1, []);
        }
        nodesByDay.get(1)!.push(node.id);
      }
      sortedDays.push(1);
    }
    
    // Process each day column
    sortedDays.forEach((day, dayIndex) => {
      const dayNodes = nodesByDay.get(day)!;
      
      // Find root nodes for this day (nodes with no incoming connections from same day)
      const rootNodes: string[] = [];
      for (const nodeId of dayNodes) {
        const hasIncomingFromSameDay = journeyEdges.some(e => {
          const sourceDay = nodeDayMap.get(e.source);
          return e.target === nodeId && sourceDay === day;
        });
        if (!hasIncomingFromSameDay) {
          rootNodes.push(nodeId);
        }
      }
      
      // If no root nodes found, use first node in day
      if (rootNodes.length === 0 && dayNodes.length > 0) {
        rootNodes.push(dayNodes[0]);
      }

      // Calculate X position for this day column (centered in column)
      const dayColumnX = START_X + dayIndex * (DAY_COLUMN_WIDTH + DAY_COLUMN_SPACING) + DAY_COLUMN_WIDTH / 2;
      
      // Arrange nodes within this day column using BFS
      const visited = new Set<string>();
      const queue: Array<{ id: string; y: number }> = [];
      
      // Start with root nodes at the top of the column
      rootNodes.forEach((rootId, index) => {
        queue.push({ id: rootId, y: START_Y + index * VERTICAL_SPACING });
      });

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current.id)) continue;

        visited.add(current.id);
        positions.set(current.id, { x: dayColumnX, y: current.y });

        const children = nodeGraph.get(current.id) || [];
        // Only process children that are in the same day
        const sameDayChildren = children.filter(childId => nodeDayMap.get(childId) === day);
        
        // Track Y position for positioning children
        let nextChildY = current.y + VERTICAL_SPACING;
        
        sameDayChildren.forEach((childId) => {
          if (!visited.has(childId)) {
            // Check if this child is already in the queue
            const alreadyInQueue = queue.some(item => item.id === childId);
            if (!alreadyInQueue) {
              queue.push({
                id: childId,
                y: nextChildY,
              });
              // Increment Y for next child (if multiple children, stack them)
              nextChildY += VERTICAL_SPACING;
            }
          }
        });
      }
      
      // Handle any unvisited nodes in this day (disconnected nodes)
      for (const nodeId of dayNodes) {
        if (!visited.has(nodeId)) {
          // Find max Y position for nodes already positioned in this day
          let maxY = START_Y;
          for (const [id, pos] of positions.entries()) {
            if (nodeDayMap.get(id) === day && pos.y > maxY) {
              maxY = pos.y;
            }
          }
          
          positions.set(nodeId, {
            x: dayColumnX,
            y: maxY + VERTICAL_SPACING,
          });
        }
      }
    });

    // Ensure ALL nodes are positioned (safety check)
    for (const node of journeyNodes) {
      if (!positions.has(node.id)) {
        // Assign to day 1 if somehow missed
        const day = nodeDayMap.get(node.id) || 1;
        const dayIndex = sortedDays.indexOf(day);
        const dayColumnX = dayIndex >= 0 
          ? START_X + dayIndex * (DAY_COLUMN_WIDTH + DAY_COLUMN_SPACING) + DAY_COLUMN_WIDTH / 2
          : START_X + DAY_COLUMN_WIDTH / 2;
        
        // Find max Y in this day column
        let maxY = START_Y;
        for (const [id, pos] of positions.entries()) {
          if (nodeDayMap.get(id) === day && pos.y > maxY) {
            maxY = pos.y;
          }
        }
        
        positions.set(node.id, {
          x: dayColumnX,
          y: maxY + VERTICAL_SPACING,
        });
      }
    }

    // Final safety check: ensure every journey node has a position
    for (const node of journeyNodes) {
      if (!positions.has(node.id)) {
        console.error(`CRITICAL: Node ${node.id} was not positioned! Assigning to day 1.`);
        const day = nodeDayMap.get(node.id) || 1;
        const dayIndex = sortedDays.indexOf(day);
        const dayColumnX = dayIndex >= 0 
          ? START_X + dayIndex * (DAY_COLUMN_WIDTH + DAY_COLUMN_SPACING) + DAY_COLUMN_WIDTH / 2
          : START_X + DAY_COLUMN_WIDTH / 2;
        
        // Find max Y in this day column
        let maxY = START_Y;
        for (const [id, pos] of positions.entries()) {
          if (nodeDayMap.get(id) === day && pos.y > maxY) {
            maxY = pos.y;
          }
        }
        
        positions.set(node.id, {
          x: dayColumnX,
          y: maxY + VERTICAL_SPACING,
        });
      }
    }

    // Update node positions (preserve day marker nodes)
    const updatedNodes = nodes.map(node => {
      // Skip day marker nodes - they'll be repositioned by DayMarkers component
      if (node.id.startsWith('day-marker-')) {
        return node;
      }
      const newPos = positions.get(node.id);
      if (!newPos) {
        console.error(`CRITICAL: Node ${node.id} still has no position after safety check! Keeping original position.`);
        return node; // Keep original position if somehow missed
      }
      // Ensure we preserve all node properties
      return {
        ...node,
        position: {
          x: newPos.x,
          y: newPos.y,
        },
        // Explicitly preserve all required properties
        id: node.id,
        type: node.type,
        data: node.data,
      };
    });

    // Verify we didn't lose any nodes
    const originalJourneyNodeCount = journeyNodes.length;
    const updatedJourneyNodeCount = updatedNodes.filter(n => !n.id.startsWith('day-marker-')).length;
    
    if (originalJourneyNodeCount !== updatedJourneyNodeCount) {
      console.error(`CRITICAL: Node count mismatch! Original: ${originalJourneyNodeCount}, Updated: ${updatedJourneyNodeCount}`);
      console.error('Original node IDs:', journeyNodes.map(n => n.id));
      console.error('Updated node IDs:', updatedNodes.filter(n => !n.id.startsWith('day-marker-')).map(n => n.id));
      toast.error(`Error: Some nodes were lost during layout. Please refresh the page.`);
      return; // Don't update if we lost nodes
    }

    // Additional verification: ensure all original node IDs are present
    const originalNodeIds = new Set(journeyNodes.map(n => n.id));
    const updatedNodeIds = new Set(updatedNodes.filter(n => !n.id.startsWith('day-marker-')).map(n => n.id));
    const missingNodeIds = Array.from(originalNodeIds).filter(id => !updatedNodeIds.has(id));
    
    if (missingNodeIds.length > 0) {
      console.error(`CRITICAL: Missing node IDs after update:`, missingNodeIds);
      toast.error(`Error: Some nodes were lost during layout. Please refresh the page.`);
      return; // Don't update if we lost nodes
    }

    setNodes(updatedNodes);
    
    // Fit view to show all repositioned nodes after a short delay to ensure nodes are rendered
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ 
          padding: 0.2, // 20% padding around nodes
          duration: 400, // Smooth animation
          minZoom: 0.1,
          maxZoom: 1.5,
        });
      }
    }, 100);
    
    toast.success('Layout cleaned! Days are now arranged side by side for better visibility.');
  };

  const handleLaunch = async () => {
    if (!journeyName) {
      toast.error('Please enter a journey name');
      return;
    }

    // Filter out day marker nodes
    const journeyNodes = nodes.filter(n => !n.id.startsWith('day-marker-'));
    if (journeyNodes.length === 0) {
      toast.error('Please add at least one node to the journey');
      return;
    }

    // Validate all nodes
    const validationErrors: string[] = [];
    for (const node of journeyNodes) {
      const error = validateNode(node);
      if (error) {
        validationErrors.push(`${node.data.type.replace(/_/g, ' ')} node: ${error}`);
      }
    }
    
    if (validationErrors.length > 0) {
      toast.error(`Validation failed:\n${validationErrors.join('\n')}`);
      return;
    }

    try {
      let currentJourneyId = journeyId;
      if (!currentJourneyId) {
        const journey = await createJourney.mutateAsync({
          name: journeyName,
          description: journeyDescription,
          status: 'DRAFT',
        });
        currentJourneyId = journey.id;
        setJourneyId(journey.id);
      } else {
        // Update journey metadata
        await updateJourney.mutateAsync({
          id: currentJourneyId,
          data: {
            name: journeyName,
            description: journeyDescription,
          },
        });
      }

      // Track nodes to delete (backend nodes that are no longer in the UI)
      const backendNodeIds = new Set<string>();
      const currentBackendNodes = journeyNodes
        .filter(n => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n.id))
        .map(n => n.id);
      
      // Get all backend nodes for this journey to find ones to delete
      if (existingJourney?.nodes) {
        existingJourney.nodes.forEach((backendNode: any) => {
          if (!currentBackendNodes.includes(backendNode.id)) {
            backendNodeIds.add(backendNode.id);
          }
        });
      }

      // Delete nodes that were removed from UI
      for (const nodeIdToDelete of backendNodeIds) {
        await deleteNode.mutateAsync({
          journeyId: currentJourneyId,
          nodeId: nodeIdToDelete,
        });
      }

      // Save all nodes (create new ones, update existing ones)
      for (const node of journeyNodes) {
        const isBackendNode = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.id);
        
        // Build connections from edges
        const connections = buildConnectionsFromEdges(node.id);
        
        // For CONDITION and WEIGHTED_PATH nodes, connections are in config
        const nodeConfig = node.data.type === 'CONDITION' || node.data.type === 'WEIGHTED_PATH'
          ? node.data.config // Config already has branches/paths with nextNodeId
          : node.data.config;
        
        if (isBackendNode) {
          // Update existing node
          await updateNode.mutateAsync({
            journeyId: currentJourneyId,
            nodeId: node.id,
            node: {
              type: node.data.type,
              config: nodeConfig,
              positionX: node.position.x,
              positionY: node.position.y,
              connections,
            },
          });
        } else {
          // Create new node
          const newNode = await addNode.mutateAsync({
            journeyId: currentJourneyId,
            node: {
              type: node.data.type,
              config: nodeConfig,
              positionX: node.position.x,
              positionY: node.position.y,
              connections,
            },
          });
          
          // Update local node ID and all references (same logic as handleSaveDraft)
          const oldNodeId = node.id;
          const newNodeId = newNode.id;
          
          setNodes((nds) =>
            nds.map((n) =>
              n.id === oldNodeId ? { ...n, id: newNodeId } : n
            )
          );
          
          setEdges((eds) =>
            eds.map((edge) =>
              edge.source === oldNodeId
                ? { ...edge, source: newNodeId }
                : edge.target === oldNodeId
                ? { ...edge, target: newNodeId }
                : edge
            )
          );
          
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === oldNodeId) return n;
              
              let updatedConfig = { ...n.data.config };
              let updatedConnections = { ...n.data.connections };
              let needsUpdate = false;
              
              if (n.data.connections?.nextNodeId === oldNodeId) {
                updatedConnections = { ...updatedConnections, nextNodeId: newNodeId };
                needsUpdate = true;
              }
              
              if (n.data.connections?.outputs) {
                const updatedOutputs: Record<string, string | undefined> = { ...n.data.connections.outputs };
                let outputsUpdated = false;
                for (const [outputKey, outputNodeId] of Object.entries(updatedOutputs)) {
                  if (outputNodeId === oldNodeId) {
                    updatedOutputs[outputKey] = newNodeId;
                    outputsUpdated = true;
                    needsUpdate = true;
                  }
                }
                if (outputsUpdated) {
                  updatedConnections = { ...updatedConnections, outputs: updatedOutputs };
                }
              }
              
              if (n.data.type === 'CONDITION' && n.data.config?.branches) {
                updatedConfig = {
                  ...updatedConfig,
                  branches: n.data.config.branches.map((branch: any) => {
                    if (branch.nextNodeId === oldNodeId) {
                      needsUpdate = true;
                      return { ...branch, nextNodeId: newNodeId };
                    }
                    return branch;
                  }),
                };
              }
              
              if (n.data.type === 'CONDITION' && n.data.config?.defaultBranch?.nextNodeId === oldNodeId) {
                updatedConfig = {
                  ...updatedConfig,
                  defaultBranch: {
                    ...n.data.config.defaultBranch,
                    nextNodeId: newNodeId,
                  },
                };
                needsUpdate = true;
              }
              
              if (n.data.type === 'WEIGHTED_PATH' && n.data.config?.paths) {
                updatedConfig = {
                  ...updatedConfig,
                  paths: n.data.config.paths.map((path: any) => {
                    if (path.nextNodeId === oldNodeId) {
                      needsUpdate = true;
                      return { ...path, nextNodeId: newNodeId };
                    }
                    return path;
                  }),
                };
              }
              
              if (needsUpdate) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    config: updatedConfig,
                    connections: updatedConnections,
                  },
                };
              }
              
              return n;
            })
          );
        }
      }

      // Launch journey
      // TODO: Call launch endpoint
      toast.success('Journey launched successfully');
      router.push(`/journeys/${currentJourneyId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to launch journey');
    }
  };

  const nodeTypesList: { type: NodeType; label: string; icon: any; description: string }[] = [
    {
      type: 'SEND_SMS',
      label: 'Send SMS',
      icon: MessageSquare,
      description: 'Send an SMS message to the contact',
    },
    {
      type: 'ADD_TO_CAMPAIGN',
      label: 'Add to Campaign',
      icon: Users,
      description: 'Add contact to a campaign',
    },
    {
      type: 'REMOVE_FROM_CAMPAIGN',
      label: 'Remove from Campaign',
      icon: UserMinus,
      description: 'Remove contact from a campaign',
    },
    {
      type: 'EXECUTE_WEBHOOK',
      label: 'Execute Webhook',
      icon: Webhook,
      description: 'Trigger an external webhook',
    },
    {
      type: 'TIME_DELAY',
      label: 'Time Delay',
      icon: Clock,
      description: 'Wait for a specified time period',
    },
    {
      type: 'CONDITION',
      label: 'Condition',
      icon: GitBranch,
      description: 'Branch based on conditions',
    },
    {
      type: 'WEIGHTED_PATH',
      label: 'Weighted Path',
      icon: Split,
      description: 'Split leads by percentage',
    },
    {
      type: 'MAKE_CALL',
      label: 'Make Call',
      icon: Phone,
      description: 'Make a voice call with a voice message',
    },
    {
      type: 'UPDATE_CONTACT_STATUS',
      label: 'Update Status',
      icon: Tag,
      description: 'Update the contact&apos;s lead status',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* ===== ORIGINAL HEADER (COMMENTED OUT) ===== */}
      {/*
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="Journey Name"
              value={journeyName}
              onChange={(e) => setJourneyName(e.target.value)}
              className="text-xl font-semibold border-0 p-0 h-auto focus-visible:ring-0"
            />
            <Textarea
              placeholder="Description (optional)"
              value={journeyDescription}
              onChange={(e) => setJourneyDescription(e.target.value)}
              className="mt-2 border-0 p-0 resize-none focus-visible:ring-0 text-sm text-muted-foreground"
              rows={1}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!journeyName || createJourney.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handleLaunch}
              disabled={!journeyName || nodes.filter(n => !n.id.startsWith('day-marker-')).length === 0 || createJourney.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Launch Journey
            </Button>
          </div>
        </div>
      </div>
      */}

      {/* ===== REFINED HEADER ===== */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1 space-y-3 min-w-0">
              <Input
                placeholder="Journey Name"
                value={journeyName}
                onChange={(e) => setJourneyName(e.target.value)}
                className="text-2xl font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-slate-400 text-slate-900"
              />
              <Textarea
                placeholder="Add a description..."
                value={journeyDescription}
                onChange={(e) => setJourneyDescription(e.target.value)}
                className="border-0 p-0 resize-none focus-visible:ring-0 text-sm text-slate-600 bg-transparent placeholder:text-slate-400"
                rows={1}
              />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="h-10 px-5"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleCleanLayout}
                disabled={nodes.filter(n => !n.id.startsWith('day-marker-')).length === 0}
                className="h-10 px-5"
                title="Automatically space all nodes for better readability"
              >
                <Layout className="h-4 w-4 mr-2" />
                Clean Layout
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={!journeyName || createJourney.isPending}
                className="h-10 px-5"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={handleLaunch}
                disabled={!journeyName || nodes.filter(n => !n.id.startsWith('day-marker-')).length === 0 || createJourney.isPending}
                className="h-10 px-6 bg-primary hover:bg-primary/90"
              >
                <Play className="h-4 w-4 mr-2" />
                Launch Journey
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== REFINED LAYOUT ===== */}
      <div className="flex flex-1 overflow-hidden bg-slate-50" style={{ height: 'calc(100vh - 140px)', minHeight: 0, maxHeight: 'calc(100vh - 140px)' }}>
        {/* Day Navigation Sidebar */}
        <DayNavigationSidebar
          nodes={nodes}
          collapsedDays={collapsedDays}
          setCollapsedDays={setCollapsedDays}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          reactFlowInstance={reactFlowInstance}
        />
        

        {/* Refined Flow Canvas - Center */}
        <div className="flex-1 relative bg-white" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <JourneyFlow
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              collapsedDays={collapsedDays}
              nodesByDayMap={nodesByDayMap}
            />
          </ReactFlowProvider>
        </div>

        {/* Refined Inspector Panel - Right Sidebar */}
        {showNodeConfig && selectedNode && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-96 flex-shrink-0 border-l border-slate-200 bg-white shadow-lg flex flex-col overflow-hidden"
          >
            <NodeInspectorPanel
              journeyId={journeyId}
              node={selectedNode}
              availableNodes={nodes.filter((n) => n.id !== selectedNode.id && !n.id.startsWith('day-marker-'))}
              setNodes={setNodes}
              setEdges={setEdges}
              onClose={() => {
                setShowNodeConfig(false);
                setSelectedNode(null);
              }}
              onSave={updateNodeConfig}
            />
          </motion.div>
        )}

        {/* Node Selector Modal */}
        {showNodeSelector && nodeSelectorPosition && (
          <NodeSelectorModal
            position={nodeSelectorPosition}
            context={nodeSelectorContext}
            onSelectNodeType={(nodeType) => {
              if (nodeSelectorContext === 'first-node') {
                // Create first node
                if (!reactFlowInstance) return;
                const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
                const position = reactFlowInstance.screenToFlowPosition({
                  x: nodeSelectorPosition.x - (reactFlowBounds?.left || 0),
                  y: nodeSelectorPosition.y - (reactFlowBounds?.top || 0),
                });
                createNodeAtPosition(nodeType, position);
              } else if (nodeSelectorContext === 'connection' && pendingConnectionTarget) {
                // Create node and connect it
                if (!reactFlowInstance) return;
                const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
                const position = reactFlowInstance.screenToFlowPosition({
                  x: nodeSelectorPosition.x - (reactFlowBounds?.left || 0),
                  y: nodeSelectorPosition.y - (reactFlowBounds?.top || 0),
                });
                const newNode = createNodeAtPosition(nodeType, position);
                // Connect the source node to the new node
                setTimeout(() => {
                  const connectionParams: Connection = {
                    source: pendingConnectionTarget.sourceNodeId,
                    sourceHandle: pendingConnectionTarget.handleId,
                    target: newNode.id,
                    targetHandle: null,
                  };
                  onConnect(connectionParams);
                }, 100);
              }
              setShowNodeSelector(false);
              setNodeSelectorPosition(null);
              setNodeSelectorContext(null);
              setPendingConnectionTarget(null);
            }}
            onSelectExistingNode={(nodeId) => {
              if (pendingConnectionTarget) {
                const connectionParams: Connection = {
                  source: pendingConnectionTarget.sourceNodeId,
                  sourceHandle: pendingConnectionTarget.handleId,
                  target: nodeId,
                  targetHandle: null,
                };
                onConnect(connectionParams);
              }
              setShowNodeSelector(false);
              setNodeSelectorPosition(null);
              setNodeSelectorContext(null);
              setPendingConnectionTarget(null);
            }}
            onClose={() => {
              setShowNodeSelector(false);
              setNodeSelectorPosition(null);
              setNodeSelectorContext(null);
              setPendingConnectionTarget(null);
            }}
            availableNodes={nodes.filter((n) => !n.id.startsWith('day-marker-'))}
            connectionSource={pendingConnectionTarget}
          />
        )}

        {/* Node Selection Popup for Wire Extension */}
        {connectionStart && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/10"
              onClick={() => setConnectionStart(null)}
            />
            {/* Popup */}
            <div
              className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-4 min-w-[280px] max-w-[320px]"
              style={{
                left: `${connectionStart.position.x + (reactFlowWrapper.current?.getBoundingClientRect().left || 0)}px`,
                top: `${connectionStart.position.y + (reactFlowWrapper.current?.getBoundingClientRect().top || 0) + 20}px`,
              }}
            >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Connect to Node</h3>
              <button
                onClick={() => setConnectionStart(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {nodes
                .filter((n) => n.id !== connectionStart.nodeId && !n.id.startsWith('day-marker-'))
                .map((node) => {
                  const Icon = nodeIcons[node.data.type as NodeType];
                  return (
                    <button
                      key={node.id}
                      onClick={() => handleSelectNodeForConnection(node.id)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center gap-3 group"
                    >
                      <div className={`${nodeStyles.iconBg} p-2 rounded-lg shadow-sm flex-shrink-0`}>
                        <Icon className="h-4 w-4 text-slate-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 truncate">
                          {node.data?.label || node.data?.type || node.id}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {node.data?.type?.toLowerCase().replace(/_/g, ' ') || 'Node'}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              {nodes.filter((n) => n.id !== connectionStart.nodeId && !n.id.startsWith('day-marker-')).length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No other nodes available to connect
                </div>
              )}
            </div>
            {connectionStart.handleId && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  Output: <span className="font-medium text-slate-700">{outputLabels[connectionStart.handleId] || connectionStart.handleId}</span>
                </div>
              </div>
            )}
          </div>
          </>
        )}


        {/* COMMENTED OUT - Original drag and drop builder */}
        {/* 
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-muted/30"
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: true,
                style: { 
                  strokeWidth: 3,
                  stroke: '#6366f1',
                },
              }}
              connectionLineStyle={{
                strokeWidth: 3,
                stroke: '#6366f1',
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
        */}
      </div>

    </div>
  );
}

// Helper function to calculate nodes by day - includes edges for proper traversal
function calculateNodesByDay(nodes: Node[], edges: Edge[] = []): Map<number, Node[]> {
  const journeyNodes = nodes.filter(n => !n.id.startsWith('day-marker-'));
  const journeyEdges = edges.filter(e => !e.id.startsWith('day-marker-edge-'));
  const nodesByDay = new Map<number, Node[]>();
  
  if (journeyNodes.length === 0) return nodesByDay;
  
  // Method 1: Check for explicit day in config/metadata
  const nodesWithExplicitDay: Node[] = [];
  const nodesWithoutDay: Node[] = [];
  
  journeyNodes.forEach(node => {
    const day = node.data.config?.day || node.data.metadata?.day;
    if (day !== undefined && typeof day === 'number') {
      if (!nodesByDay.has(day)) {
        nodesByDay.set(day, []);
      }
      nodesByDay.get(day)!.push(node);
      nodesWithExplicitDay.push(node);
    } else {
      nodesWithoutDay.push(node);
    }
  });

  // Method 2: For nodes without explicit day, infer from TIME_DELAY nodes with DAYS unit
  if (nodesWithoutDay.length > 0) {
    const nodeMap = new Map<string, Node>();
    // Include all nodes in map for connection traversal
    journeyNodes.forEach(node => nodeMap.set(node.id, node));
    
    // Find root nodes - nodes with NO incoming edges (based SOLELY on connection cables)
    const rootNodes = nodesWithoutDay.filter(node => {
      // Check ONLY edges (connection cables), ignore positions and node connections
      return !journeyEdges.some(e => e.target === node.id);
    });

    const nodeDays = new Map<string, number>();
    let currentDay = 1;
    const queue: Array<{ nodeId: string; day: number }> = rootNodes.map(n => ({ nodeId: n.id, day: currentDay }));
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { nodeId, day } = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (!node) continue;
      
      // Skip if node already has explicit day assignment (from Method 1)
      const explicitDay = node.data.config?.day || node.data.metadata?.day;
      if (explicitDay !== undefined && typeof explicitDay === 'number') {
        // Node already has explicit day, skip but still traverse from it
        // Use explicit day for calculating next day increment
        let dayIncrement = 0;
        if (node.data.type === 'TIME_DELAY' && node.data.config?.delayUnit === 'DAYS') {
          dayIncrement = node.data.config.delayValue || 0;
        }
        const nextDay = explicitDay + dayIncrement;
        
      // Find next nodes ONLY from edges (connection cables) - ignore positions
      const nextNodeIds: string[] = [];
      journeyEdges.filter(e => e.source === nodeId).forEach(e => {
        if (!nextNodeIds.includes(e.target)) nextNodeIds.push(e.target);
      });
        
        nextNodeIds.forEach(nextId => {
          if (!visited.has(nextId) && nodeMap.has(nextId)) {
            queue.push({ nodeId: nextId, day: nextDay });
          }
        });
        continue;
      }
      
      // TIME_DELAY nodes with DAYS unit mark the END of the current day
      // They belong to the current day, and nodes AFTER them start the next day
      let nodeDay = day;
      let dayIncrement = 0;
      
      if (node.data.type === 'TIME_DELAY' && node.data.config?.delayUnit === 'DAYS') {
        // TIME_DELAY nodes with DAYS unit mark the end of the current day
        // They stay in the current day, but increment for next nodes
        dayIncrement = node.data.config.delayValue || 0;
        nodeDay = day; // Stay in current day (marks end of day)
      } else {
        // Regular nodes: they belong to the current day
        nodeDay = day;
      }
      
      // Assign node to its day
      nodeDays.set(nodeId, nodeDay);
      if (!nodesByDay.has(nodeDay)) {
        nodesByDay.set(nodeDay, []);
      }
      nodesByDay.get(nodeDay)!.push(node);
      
      // Calculate next day: current day + increment from TIME_DELAY
      // Nodes connected AFTER (via edges) a TIME_DELAY with DAYS unit will be in nextDay
      const nextDay = day + dayIncrement;
      
      // Find next nodes ONLY from edges (connection cables) - ignore positions completely
      const nextNodeIds: string[] = [];
      journeyEdges
        .filter(e => e.source === nodeId)
        .forEach(e => {
          if (!nextNodeIds.includes(e.target)) {
            nextNodeIds.push(e.target);
          }
        });
      
      nextNodeIds.forEach(nextId => {
        if (!visited.has(nextId) && nodeMap.has(nextId)) {
          queue.push({ nodeId: nextId, day: nextDay });
        }
      });
    }
    
    // Assign remaining unvisited nodes (from nodesWithoutDay) to day 1
    nodesWithoutDay.forEach(node => {
      if (!visited.has(node.id)) {
        if (!nodesByDay.has(1)) {
          nodesByDay.set(1, []);
        }
        nodesByDay.get(1)!.push(node);
      }
    });
  }
  
  return nodesByDay;
}

// Day Navigation Sidebar Component
function DayNavigationSidebar({
  nodes,
  collapsedDays,
  setCollapsedDays,
  selectedDay,
  setSelectedDay,
  reactFlowInstance,
}: {
  nodes: Node[];
  collapsedDays: Set<number>;
  setCollapsedDays: (days: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  selectedDay: number | null;
  setSelectedDay: (day: number | null) => void;
  reactFlowInstance: any;
}) {
  const nodesByDay = useMemo(() => {
    // This is just for display, edges aren't needed here
    return calculateNodesByDay(nodes, []);
  }, [nodes]);
  const sortedDays = useMemo(() => Array.from(nodesByDay.keys()).sort((a, b) => a - b), [nodesByDay]);

  const toggleDayCollapse = (day: number) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const focusOnDay = (day: number) => {
    const dayNodes = nodesByDay.get(day);
    if (!dayNodes || dayNodes.length === 0 || !reactFlowInstance) return;

    setSelectedDay(day);
    
    // Calculate bounding box of day nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    dayNodes.forEach(node => {
      const nodeWidth = node.width || 260;
      const nodeHeight = node.height || 100;
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + nodeWidth);
      maxY = Math.max(maxY, node.position.y + nodeHeight);
    });

    if (minX !== Infinity) {
      const padding = 100;
      reactFlowInstance.fitView({
        padding: padding,
        minZoom: 0.5,
        maxZoom: 1.5,
        nodes: dayNodes.map(n => ({ id: n.id })),
        duration: 500,
      });
    }
  };

  const toggleDayVisibility = (day: number) => {
    toggleDayCollapse(day);
    if (!collapsedDays.has(day)) {
      focusOnDay(day);
    }
  };

  if (sortedDays.length === 0) {
    return (
      <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-900">Journey Timeline</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No days detected</p>
            <p className="text-xs text-slate-400 mt-1">Add nodes to see timeline</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm">
      <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Journey Timeline</h3>
        <p className="text-xs text-slate-600">{sortedDays.length} day{sortedDays.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {sortedDays.map(day => {
            const dayNodes = nodesByDay.get(day) || [];
            const isCollapsed = collapsedDays.has(day);
            const isSelected = selectedDay === day;
            const nodeCount = dayNodes.length;

            return (
              <div
                key={day}
                className={`group rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleDayVisibility(day)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Calendar className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-slate-500'}`} />
                      <span className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                        Day {day}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {nodeCount}
                    </span>
                    {isCollapsed ? (
                      <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                </button>
                
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 pb-2 space-y-1"
                  >
                    {dayNodes.slice(0, 5).map((node, idx) => {
                      const Icon = nodeIcons[node.data.type as NodeType];
                      return (
                        <div
                          key={node.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <Icon className="h-3 w-3 text-slate-500 flex-shrink-0" />
                          <span className="truncate flex-1">{node.data.label || node.data.type}</span>
                        </div>
                      );
                    })}
                    {dayNodes.length > 5 && (
                      <div className="text-xs text-slate-400 px-2 py-1">
                        +{dayNodes.length - 5} more
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50/50">
        <button
          onClick={() => {
            if (collapsedDays.size === sortedDays.length) {
              setCollapsedDays(new Set());
            } else {
              setCollapsedDays(new Set(sortedDays));
            }
          }}
          className="w-full text-xs text-slate-600 hover:text-slate-900 font-medium py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {collapsedDays.size === sortedDays.length ? 'Expand All' : 'Collapse All'}
        </button>
      </div>
    </div>
  );
}

// Node Selector Modal Component
function NodeSelectorModal({
  position,
  context,
  onSelectNodeType,
  onSelectExistingNode,
  onClose,
  availableNodes,
  connectionSource,
}: {
  position: { x: number; y: number };
  context: 'first-node' | 'connection' | null;
  onSelectNodeType: (nodeType: NodeType) => void;
  onSelectExistingNode: (nodeId: string) => void;
  onClose: () => void;
  availableNodes: Node[];
  connectionSource: { sourceNodeId: string; handleId: string | null } | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && event.target && !modalRef.current.contains(event.target as unknown as globalThis.Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const nodeTypesList: { type: NodeType; label: string; icon: any; description: string }[] = [
    {
      type: 'SEND_SMS',
      label: 'Send SMS',
      icon: MessageSquare,
      description: 'Send an SMS message to the contact',
    },
    {
      type: 'ADD_TO_CAMPAIGN',
      label: 'Add to Campaign',
      icon: Users,
      description: 'Add contact to a campaign',
    },
    {
      type: 'REMOVE_FROM_CAMPAIGN',
      label: 'Remove from Campaign',
      icon: UserMinus,
      description: 'Remove contact from a campaign',
    },
    {
      type: 'EXECUTE_WEBHOOK',
      label: 'Execute Webhook',
      icon: Webhook,
      description: 'Trigger an external webhook',
    },
    {
      type: 'TIME_DELAY',
      label: 'Time Delay',
      icon: Clock,
      description: 'Wait for a specified time period',
    },
    {
      type: 'CONDITION',
      label: 'Condition',
      icon: GitBranch,
      description: 'Branch based on conditions',
    },
    {
      type: 'WEIGHTED_PATH',
      label: 'Weighted Path',
      icon: Split,
      description: 'Split leads by percentage',
    },
    {
      type: 'MAKE_CALL',
      label: 'Make Call',
      icon: Phone,
      description: 'Make a voice call with a voice message',
    },
    {
      type: 'UPDATE_CONTACT_STATUS',
      label: 'Update Status',
      icon: Tag,
      description: 'Update the contact\'s lead status',
    },
  ];

  const filteredNodeTypes = nodeTypesList.filter((nodeType) =>
    nodeType.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nodeType.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExistingNodes = availableNodes.filter((node) => {
    if (connectionSource && node.id === connectionSource.sourceNodeId) return false;
    if (node.id.startsWith('day-marker-')) return false;
    return node.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           node.data?.type?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        ref={modalRef}
        className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-6 min-w-[400px] max-w-[500px] max-h-[600px] flex flex-col"
        style={{
          left: `${Math.min(position.x, window.innerWidth - 500)}px`,
          top: `${Math.min(position.y, window.innerHeight - 600)}px`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {context === 'first-node' ? 'Add First Node' : 'Add Node or Connect'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 h-10 text-sm border border-slate-200 rounded-lg focus-visible:border-primary"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* New Node Types */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 px-1">
              {context === 'connection' ? 'Create New Node' : 'Select Node Type'}
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {filteredNodeTypes.map((nodeType) => {
                const Icon = nodeType.icon;
                return (
                  <button
                    key={nodeType.type}
                    onClick={() => onSelectNodeType(nodeType.type as NodeType)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3 group"
                  >
                    <div className={`${nodeStyles.iconBg} p-2.5 rounded-lg shadow-sm flex-shrink-0 group-hover:${nodeStyles.iconBgHover} transition-all`}>
                      <Icon className="h-4 w-4 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900">{nodeType.label}</div>
                      <div className="text-xs text-slate-600 leading-relaxed">{nodeType.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Existing Nodes (only for connection context) */}
          {context === 'connection' && filteredExistingNodes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 px-1">Connect to Existing Node</h4>
              <div className="space-y-1">
                {filteredExistingNodes.map((node) => {
                  const Icon = nodeIcons[node.data.type as NodeType];
                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectExistingNode(node.id)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center gap-3 group"
                    >
                      <div className={`${nodeStyles.iconBg} p-2 rounded-lg shadow-sm flex-shrink-0`}>
                        <Icon className="h-4 w-4 text-slate-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-900 truncate">
                          {node.data?.label || node.data?.type || node.id}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {node.data?.type?.toLowerCase().replace(/_/g, ' ') || 'Node'}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Day Marker Node Component - Enhanced Design
function DayMarkerNode({ data, selected }: { data: { day: number; isStart: boolean }; selected: boolean }) {
  return (
    <div className={`relative px-6 py-4 rounded-xl border-2 shadow-xl flex items-center gap-3 transition-all ${
      data.isStart 
        ? 'bg-gradient-to-r from-primary to-primary/90 border-primary text-white' 
        : 'bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600 text-slate-100'
    } ${selected ? 'ring-4 ring-primary/30 scale-105' : ''}`}>
      <div className={`p-2 rounded-lg ${data.isStart ? 'bg-white/20' : 'bg-slate-600/30'}`}>
        <Calendar className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold whitespace-nowrap">
          {data.isStart ? `Day ${data.day} Start` : `Day ${data.day} End`}
        </span>
        {data.isStart && (
          <span className="text-xs opacity-90 mt-0.5">Journey begins here</span>
        )}
      </div>
      {data.isStart && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

// Day Markers Component - Creates actual nodes and edges for day markers
function DayMarkers({ nodes, edges, setNodes, setEdges, collapsedDays }: { nodes: Node[]; edges: Edge[]; setNodes: any; setEdges: any; collapsedDays?: Set<number> }) {
  const reactFlowInstance = useReactFlow();
  const lastProcessedNodesRef = React.useRef<string>('');

  React.useEffect(() => {
    if (!reactFlowInstance) return;

    // Filter out day marker nodes from the actual journey nodes
    const journeyNodes = nodes.filter(n => !n.id.startsWith('day-marker-'));
    
    if (journeyNodes.length === 0) {
      // Remove any existing day marker nodes
      setNodes((nds: Node[]) => {
        const filtered = nds.filter(n => !n.id.startsWith('day-marker-'));
        return filtered.length !== nds.length ? filtered : nds;
      });
      setEdges((eds: Edge[]) => {
        const filtered = eds.filter(e => !e.id.startsWith('day-marker-edge-'));
        return filtered.length !== eds.length ? filtered : eds;
      });
      return;
    }

    // Create a stable key from journey node IDs to detect actual changes
    const journeyNodeIds = journeyNodes.map(n => n.id).sort().join(',');
    const journeyNodePositions = journeyNodes.map(n => `${n.id}:${n.position.x},${n.position.y}`).sort().join('|');
    const stableKey = `${journeyNodeIds}|${journeyNodePositions}`;
    
    // Skip if we've already processed these exact nodes
    if (lastProcessedNodesRef.current === stableKey) {
      return;
    }
    
    lastProcessedNodesRef.current = stableKey;

    // Group journey nodes by day - first try explicit day property, then infer from TIME_DELAY nodes with DAYS unit
    const nodesByDay = new Map<number, Node[]>();
    
    // Method 1: Check for explicit day in config/metadata
    journeyNodes.forEach(node => {
      const day = node.data.config?.day || node.data.metadata?.day;
      if (day !== undefined && typeof day === 'number') {
        if (!nodesByDay.has(day)) {
          nodesByDay.set(day, []);
        }
        nodesByDay.get(day)!.push(node);
      }
    });

    // Method 2: If no explicit day data, infer from TIME_DELAY nodes with DAYS unit
    if (nodesByDay.size === 0) {
      // Build a graph to traverse nodes and calculate cumulative days
      const nodeMap = new Map<string, Node>();
      journeyNodes.forEach(node => nodeMap.set(node.id, node));
      
      // Find root nodes (nodes with no incoming edges)
      const rootNodes = journeyNodes.filter(node => {
        return !journeyNodes.some(n => {
          if (n.data.type === 'CONDITION' && n.data.config?.branches) {
            return n.data.config.branches.some((b: any) => b.nextNodeId === node.id);
          }
          if (n.data.type === 'WEIGHTED_PATH' && n.data.config?.paths) {
            return n.data.config.paths.some((p: any) => p.nextNodeId === node.id);
          }
          if (n.data.connections?.nextNodeId === node.id) {
            return true;
          }
          if (n.data.connections?.outputs) {
            return Object.values(n.data.connections.outputs).includes(node.id);
          }
          return false;
        });
      });

      // Calculate day for each node based on cumulative DAY delays
      const nodeDays = new Map<string, number>();
      let currentDay = 1;
      
      // BFS traversal to assign days
      const queue: Array<{ nodeId: string; day: number }> = rootNodes.map(n => ({ nodeId: n.id, day: currentDay }));
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const { nodeId, day } = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        
        const node = nodeMap.get(nodeId);
        if (!node) continue;
        
        // TIME_DELAY nodes with DAYS unit mark the END of the current day
        // They belong to the current day, and nodes AFTER them start the next day
        let nodeDay = day;
        let dayIncrement = 0;
        
        if (node.data.type === 'TIME_DELAY' && node.data.config?.delayUnit === 'DAYS') {
          // TIME_DELAY nodes with DAYS unit mark the end of the current day
          // They stay in the current day, but increment for next nodes
          dayIncrement = node.data.config.delayValue || 0;
          nodeDay = day; // Stay in current day (marks end of day)
        } else {
          // Regular nodes: check if they come after a DAYS delay
          // This is handled by the day passed in the queue
          nodeDay = day;
        }
        
        // Assign node to its day
        nodeDays.set(nodeId, nodeDay);
        if (!nodesByDay.has(nodeDay)) {
          nodesByDay.set(nodeDay, []);
        }
        nodesByDay.get(nodeDay)!.push(node);
        
        // Calculate next day: current day + increment from TIME_DELAY
        const nextDay = day + dayIncrement;
        
        // Find next nodes
        const nextNodeIds: string[] = [];
        
        if (node.data.connections?.nextNodeId) {
          nextNodeIds.push(node.data.connections.nextNodeId);
        }
        if (node.data.connections?.outputs) {
          nextNodeIds.push(...Object.values(node.data.connections.outputs).filter((id): id is string => typeof id === 'string'));
        }
        if (node.data.type === 'CONDITION' && node.data.config?.branches) {
          node.data.config.branches.forEach((b: any) => {
            if (b.nextNodeId) nextNodeIds.push(b.nextNodeId);
          });
          if (node.data.config.defaultBranch?.nextNodeId) {
            nextNodeIds.push(node.data.config.defaultBranch.nextNodeId);
          }
        }
        if (node.data.type === 'WEIGHTED_PATH' && node.data.config?.paths) {
          node.data.config.paths.forEach((p: any) => {
            if (p.nextNodeId) nextNodeIds.push(p.nextNodeId);
          });
        }
        
        // Add next nodes to queue
        nextNodeIds.forEach(nextId => {
          if (!visited.has(nextId)) {
            queue.push({ nodeId: nextId, day: nextDay });
          }
        });
      }
      
      // Assign remaining nodes to day 1 if they weren't visited
      journeyNodes.forEach(node => {
        if (!visited.has(node.id)) {
          if (!nodesByDay.has(1)) {
            nodesByDay.set(1, []);
          }
          nodesByDay.get(1)!.push(node);
        }
      });
    }

    if (nodesByDay.size === 0) {
      // Remove any existing day marker nodes
      setNodes((nds: Node[]) => nds.filter(n => !n.id.startsWith('day-marker-')));
      setEdges((eds: Edge[]) => eds.filter(e => !e.id.startsWith('day-marker-edge-')));
      return;
    }

    const sortedDays = Array.from(nodesByDay.keys()).sort((a, b) => a - b);
    const markerNodes: Node[] = [];
    const markerEdges: Edge[] = [];

    sortedDays.forEach(day => {
      const dayNodes = nodesByDay.get(day)!;
      if (dayNodes.length === 0) return;
      
      // Skip creating markers for collapsed days
      if (collapsedDays && collapsedDays.has(day)) {
        return;
      }

      // Find the last node of the day (node with highest Y position that has no outgoing connections within the same day)
      const lastNode = dayNodes.reduce((last, node) => {
        // Check if this node has outgoing connections to other nodes in the same day
        const hasOutgoingInDay = dayNodes.some(n => {
          return node.data.connections?.nextNodeId === n.id ||
                 Object.values(node.data.connections?.outputs || {}).includes(n.id) ||
                 (node.data.type === 'CONDITION' && node.data.config?.branches?.some((b: any) => b.nextNodeId === n.id)) ||
                 (node.data.type === 'WEIGHTED_PATH' && node.data.config?.paths?.some((p: any) => p.nextNodeId === n.id));
        });
        
        // Prefer nodes with no outgoing connections within the same day, otherwise use highest Y
        if (!hasOutgoingInDay) {
          if (last === null || node.position.y > last.position.y) {
            return node;
          }
        }
        // If current last has outgoing connections but this node doesn't, prefer this one
        if (last && dayNodes.some(n => {
          return last.data.connections?.nextNodeId === n.id ||
                 Object.values(last.data.connections?.outputs || {}).includes(n.id);
        })) {
          if (!hasOutgoingInDay) {
            return node;
          }
        }
        // Otherwise, use highest Y position
        if (last === null || node.position.y > last.position.y) {
          return node;
        }
        return last;
      }, null as Node | null);

      if (!lastNode) return;

      // Calculate position for day marker (below last node)
      const markerY = lastNode.position.y + 150;
      const markerX = lastNode.position.x;

      // Create day marker node
      const markerNodeId = `day-marker-${day}-end`;
      const markerNode: Node = {
        id: markerNodeId,
        type: 'dayMarker',
        position: { x: markerX, y: markerY },
        data: {
          day,
          isStart: false,
        },
        draggable: false,
        selectable: false,
      };

      markerNodes.push(markerNode);

      // Create edge from last node to day marker
      const markerEdge: Edge = {
        id: `day-marker-edge-${day}`,
        source: lastNode.id,
        target: markerNodeId,
        type: 'smoothstep',
        animated: false,
        style: {
          strokeWidth: 2,
          stroke: '#94a3b8',
          strokeDasharray: '5,5',
        },
      };

      markerEdges.push(markerEdge);
    });

    // Update nodes and edges - batch updates to avoid infinite loops
    setNodes((nds: Node[]) => {
      // Remove old day markers
      const withoutMarkers = nds.filter(n => !n.id.startsWith('day-marker-'));
      // Check if we need to update
      const markerNodeIds = new Set(markerNodes.map(n => n.id));
      const existingMarkerIds = new Set(withoutMarkers.filter(n => n.id.startsWith('day-marker-')).map(n => n.id));
      
      // Only update if markers changed
      if (markerNodes.length === 0 && existingMarkerIds.size === 0) {
        return nds; // No change needed
      }
      
      const markerIdsChanged = markerNodes.length !== existingMarkerIds.size ||
        markerNodes.some(n => !existingMarkerIds.has(n.id));
      
      if (!markerIdsChanged && markerNodes.length === 0) {
        return nds; // No change needed
      }
      
      // Add new day markers
      return [...withoutMarkers, ...markerNodes];
    });

    setEdges((eds: Edge[]) => {
      // Remove old day marker edges
      const withoutMarkerEdges = eds.filter(e => !e.id.startsWith('day-marker-edge-'));
      // Check if we need to update
      const markerEdgeIds = new Set(markerEdges.map(e => e.id));
      const existingMarkerEdgeIds = new Set(eds.filter(e => e.id.startsWith('day-marker-edge-')).map(e => e.id));
      
      // Only update if marker edges changed
      if (markerEdges.length === 0 && existingMarkerEdgeIds.size === 0) {
        return eds; // No change needed
      }
      
      const markerEdgesChanged = markerEdges.length !== existingMarkerEdgeIds.size ||
        markerEdges.some(e => !existingMarkerEdgeIds.has(e.id));
      
      if (!markerEdgesChanged && markerEdges.length === 0) {
        return eds; // No change needed
      }
      
      // Add new day marker edges
      return [...withoutMarkerEdges, ...markerEdges];
    });
  }, [nodes, reactFlowInstance, setNodes, setEdges, collapsedDays]); // Added collapsedDays to dependencies

  return null;
}

function NodeInspectorPanel({
  node,
  onClose,
  onSave,
  availableNodes = [],
  setNodes,
  setEdges,
  journeyId,
}: {
  node: Node;
  onClose: () => void;
  onSave: (config: any) => void;
  availableNodes?: Node[];
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  journeyId?: string | null;
}) {
  const [config, setConfig] = useState(() => {
    // Ensure we preserve all config properties including numberPoolId
    const nodeConfig = node.data.config || {};
    return { ...nodeConfig };
  });
  const [connections, setConnections] = useState(() => {
    // Initialize connections from node.data.connections
    return node.data.connections || {};
  });
  const [showWebhookAiBuilder, setShowWebhookAiBuilder] = useState(false);
  const nodeType = node.data.type;
  
  // State for selected output in the dropdown menu
  // Memoize outputs to prevent React hooks error #185
  const outputs = useMemo(() => nodeOutputs[nodeType as NodeType] || [], [nodeType]);
  const [selectedOutput, setSelectedOutput] = useState<string>(outputs[0] || '');
  
  // Create stable string representation of outputs for dependency tracking
  const outputsKey = useMemo(() => outputs.join(','), [outputs]);
  
  // Sync connections when node prop changes
  useEffect(() => {
    if (node.data.connections) {
      setConnections(node.data.connections);
    }
  }, [node.data.connections]);
  
  // Reset selected output when node changes or outputs change
  useEffect(() => {
    if (outputs.length > 0 && !outputs.includes(selectedOutput)) {
      setSelectedOutput(outputs[0]);
    }
  }, [node.id, outputsKey, outputs, selectedOutput]);
  const { data: campaigns = [] } = useCampaigns();
  const { data: templates = [] } = useTemplates();
  const { data: contentAiTemplates = [] } = useContentAiTemplates();
  const { data: webhooks = [] } = useWebhooks();
  const { data: numberPools = [] } = useNumberPools();
  const { data: eventTypes = [] } = useEventTypes();
  const { data: voiceTemplates = [] } = useVoiceTemplates();
  const { data: voiceAudioFiles = [] } = useVoiceAudioFiles();
  const { data: voiceDids = [] } = useVoiceDids('active');
  const { data: didPools } = useDidPools();
  
  // Filter DIDs based on selected pool type
  const filteredDids = useMemo(() => {
    if (!didPools || !config.didPoolType) {
      return voiceDids; // Show all DIDs if no pool type selected
    }
    
    if (config.didPoolType === 'Twilio') {
      return didPools.twilio.dids.filter((did: any) => did.status === 'active');
    } else {
      return didPools.mc.dids.filter((did: any) => did.status === 'active');
    }
  }, [didPools, config.didPoolType, voiceDids]);
  
  // Get journey audio files for content AI templates with journey descriptions
  const templatesWithJourney = contentAiTemplates.filter(t => t.journeyDescription);
  const [selectedContentAiTemplateId, setSelectedContentAiTemplateId] = useState<string | null>(null);
  const { data: journeyAudioFiles = [] } = useJourneyAudioFiles(selectedContentAiTemplateId);
  const previewVoiceTemplate = usePreviewVoiceTemplate();
  const selectedVoiceTemplate = useVoiceTemplate(config.voiceTemplateId || '');
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Cleanup blob URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewAudioUrl && previewAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);

  const handleSave = () => {
    // Update the node with current connections before saving
    // This ensures connections are persisted when saving
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id
          ? {
              ...n,
              data: {
                ...n.data,
                config: config,
                connections: connections,
              },
            }
          : n
      )
    );
    
    // Save config (connections will be read from updated node state in updateNodeConfig)
    onSave(config);
  };

  const handlePreviewVoiceTemplate = async () => {
    if (!config.voiceTemplateId) return;
    
    setIsGeneratingPreview(true);
    try {
      // Get sample variable values from the selected template
      const template = selectedVoiceTemplate.data;
      const sampleVariables: Record<string, string> = {};
      
      if (template?.variables) {
        // Use sample values for preview
        template.variables.forEach((varName: string) => {
          sampleVariables[varName] = varName === 'firstName' ? 'John' :
            varName === 'appointmentTime' ? '2:30 PM' :
            varName === 'appointmentDate' ? 'December 15, 2024' :
            varName === 'appointmentDateTime' ? 'December 15, 2024 2:30 PM' :
                                    varName === 'lastName' ? 'Doe' :
                                    varName === 'phoneNumber' ? '5551234567' :
                                    varName === 'email' ? 'john@example.com' : 'Sample';
        });
      }

      const result = await previewVoiceTemplate.mutateAsync({
        templateId: config.voiceTemplateId,
        variableValues: sampleVariables,
      });

      // Fetch the audio file as a blob with authentication
      // Use the same API URL logic as apiClient to ensure HTTPS compatibility
      const getApiBaseUrl = () => {
        if (typeof window === 'undefined') {
          return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
        }
        
        const hostname = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
        
        // Use custom domain if accessing via app.nurtureengine.net
        if (hostname === 'app.nurtureengine.net') {
          return `${protocol}://api.nurtureengine.net/api`;
        }
        
        // Check if accessing via external IP (for backward compatibility)
        const isExternal = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.net');
        
        if (isExternal) {
          // Use external IP for API when accessed via IP address
          return `${protocol}://${hostname}:5002/api`;
        }
        
        // Default to localhost for local development
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
      };
      
      const apiBaseUrl = getApiBaseUrl();
      const streamUrl = `${apiBaseUrl}/voice-messages/generated-audio/${result.generatedAudioId}/stream`;
      
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      // Fetch audio as blob
      const response = await fetch(streamUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewAudioUrl(blobUrl);
    } catch (error) {
      console.error('Failed to preview voice template:', error);
      alert('Failed to generate preview. Please try again.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Available fields for condition node
  const conditionFields = [
    { value: 'contact.firstName', label: 'Contact First Name', type: 'text' },
    { value: 'contact.lastName', label: 'Contact Last Name', type: 'text' },
    { value: 'contact.email', label: 'Contact Email', type: 'text' },
    { value: 'contact.phoneNumber', label: 'Contact Phone Number', type: 'text' },
    { value: 'contact.leadStatus', label: 'Lead Status', type: 'leadStatus' },
    { value: 'contact.hasConsent', label: 'Contact Has Consent', type: 'boolean' },
    { value: 'contact.isOptedOut', label: 'Contact Is Opted Out', type: 'boolean' },
    { value: 'message.received', label: 'Message Received (Any)', type: 'boolean' },
    { value: 'message.receivedInJourney', label: 'Message Received in Journey', type: 'boolean' },
    { value: 'message.receivedInCampaign', label: 'Message Received in Campaign', type: 'boolean' },
    { value: 'call.status', label: 'Call Status', type: 'callStatus' },
    { value: 'call.answered', label: 'Call Answered', type: 'boolean' },
    { value: 'call.noAnswer', label: 'Call No Answer', type: 'boolean' },
    { value: 'call.failed', label: 'Call Failed', type: 'boolean' },
    { value: 'call.transferred', label: 'Call Transferred', type: 'boolean' },
    { value: 'call.received', label: 'Call Received (Any)', type: 'boolean' },
  ];

  // Fetch tenant-specific lead statuses
  const { data: leadStatuses = [] } = useLeadStatuses();
  const leadStatusOptions = leadStatuses
    .filter((status) => status.isActive)
    .map((status) => ({
      value: status.name,
      label: status.name,
    }));

  const callStatusOptions = [
    { value: 'initiated', label: 'Initiated' },
    { value: 'connected', label: 'Connected' },
    { value: 'answered', label: 'Answered' },
    { value: 'failed', label: 'Failed' },
    { value: 'completed', label: 'Completed' },
    { value: 'no_answer', label: 'No Answer' },
  ];

  const booleanOptions = [
    { value: 'true', label: 'True' },
    { value: 'false', label: 'False' },
  ];

  const conditionOperators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'exists', label: 'Exists' },
    { value: 'not_exists', label: 'Not Exists' },
  ];

  const addConditionBranch = () => {
    const newBranch = {
      id: `branch_${Date.now()}`,
      label: `Branch ${(config.branches?.length || 0) + 1}`,
      condition: {
        field: 'contact.firstName',
        operator: 'equals',
        value: '',
      },
      nextNodeId: '',
    };
    setConfig({
      ...config,
      branches: [...(config.branches || []), newBranch],
    });
  };

  const updateBranch = (branchId: string, updates: any) => {
    const updatedBranches = (config.branches || []).map((b: any) =>
      b.id === branchId ? { ...b, ...updates } : b,
    );
    const updatedConfig = {
      ...config,
      branches: updatedBranches,
    };
    setConfig(updatedConfig);
    
    // Update edges when nextNodeId changes
    if (updates.nextNodeId !== undefined) {
      const branch = updatedBranches.find((b: any) => b.id === branchId);
      if (branch) {
        setEdges((eds) => {
          // Remove old edge for this branch
          const withoutOldEdge = eds.filter(
            (e) => !(e.source === node.id && e.sourceHandle === `branch-${branchId}`)
          );
          
          // Add new edge if nextNodeId is set
          if (updates.nextNodeId) {
            return [
              ...withoutOldEdge,
              {
                id: `edge-${node.id}-${updates.nextNodeId}-branch-${branchId}`,
                source: node.id,
                sourceHandle: `branch-${branchId}`,
                target: updates.nextNodeId,
                type: 'smoothstep',
                animated: true,
                style: {
                  strokeWidth: 2,
                  stroke: '#94a3b8',
                },
                label: branch.label || '',
                labelStyle: { fill: '#64748b', fontWeight: 500 },
              },
            ];
          }
          
          return withoutOldEdge;
        });
        
        // Update node connections in state
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    config: updatedConfig,
                  },
                }
              : n
          )
        );
      }
    }
  };

  const removeBranch = (branchId: string) => {
    setConfig({
      ...config,
      branches: (config.branches || []).filter((b: any) => b.id !== branchId),
    });
  };

  const Icon = nodeIcons[nodeType as NodeType];
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Simple Header */}
      <div className="bg-slate-800 p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Configure Node</h2>
              <p className="text-sm text-white/90">
                {nodeType.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4"
      >
          {nodeType === 'SEND_SMS' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-slate-200/60 shadow-sm"
              >
                <label className="text-sm font-bold mb-2 block text-slate-900">Message Content</label>
                <Textarea
                  value={config.messageContent || ''}
                  onChange={(e) => setConfig({ ...config, messageContent: e.target.value })}
                  placeholder="Enter your SMS message..."
                  rows={4}
                  className="bg-white/80 border-slate-200/80 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
                />
                <p className="text-xs text-slate-600 mt-2 font-medium">
                  Variables: {'{'}{'{'}firstName{'}'}{'}'}, {'{'}{'{'}lastName{'}'}{'}'}, {'{'}{'{'}fullName{'}'}{'}'}, {'{'}{'{'}email{'}'}{'}'}, {'{'}{'{'}phoneNumber{'}'}{'}'}, {'{'}{'{'}appUrl{'}'}{'}'}, {'{'}{'{'}baseUrl{'}'}{'}'}
                  {config.eventTypeId && (
                    <span className="block mt-1">
                      Use {'{'}{'{'}calendarLink{'}'}{'}'} to insert the booking link.
                    </span>
                  )}
                  <span className="block mt-1">
                    Appointment: {'{'}{'{'}appointmentTime{'}'}{'}'}, {'{'}{'{'}appointmentDate{'}'}{'}'}, {'{'}{'{'}appointmentDateTime{'}'}{'}'} (formatted in contact&apos;s timezone)
                  </span>
                </p>
              </motion.div>
              <div>
                <label className="text-sm font-medium mb-2 block">Content AI Template</label>
                <select
                  value={config.contentAiTemplateId || ''}
                  onChange={(e) => {
                    const value = e.target.value || undefined;
                    setConfig({ 
                      ...config, 
                      contentAiTemplateId: value,
                      // Clear regular template if Content AI is selected
                      templateId: value ? undefined : config.templateId,
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">None (use regular template or message)</option>
                  {contentAiTemplates
                    .filter((t) => t.isActive)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} {template.unique ? '(Unique)' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Use AI to generate variations or unique messages for each send
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Regular Template</label>
                <select
                  value={config.templateId || ''}
                  onChange={(e) => {
                    const value = e.target.value || undefined;
                    setConfig({ 
                      ...config, 
                      templateId: value,
                      // Clear Content AI template if regular template is selected
                      contentAiTemplateId: value ? undefined : config.contentAiTemplateId,
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!!config.contentAiTemplateId}
                >
                  <option value="">Select a template (optional)</option>
                  {templates
                    .filter((t) => t.type === 'OUTREACH' || t.type === 'REPLY' || t.type === 'SYSTEM')
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </select>
                {config.contentAiTemplateId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Disabled when Content AI template is selected
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Number Pool</label>
                <select
                  value={config.numberPoolId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfig({ 
                      ...config, 
                      numberPoolId: value === '' ? undefined : value 
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Default Pool</option>
                  {numberPools
                    .filter((p) => p.isActive)
                    .map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Calendar Event Type (Optional)</label>
                <select
                  value={config.eventTypeId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfig({ 
                      ...config, 
                      eventTypeId: value === '' ? undefined : value 
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">None</option>
                  {eventTypes
                    .filter((et) => et.isActive)
                    .map((eventType) => (
                      <option key={eventType.id} value={eventType.id}>
                        {eventType.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select an event type to include a booking link. Use {'{'}{'{'}calendarLink{'}'}{'}'} in your message to insert the link.
                </p>
              </div>
            </>
          )}

          {(nodeType === 'ADD_TO_CAMPAIGN' || nodeType === 'REMOVE_FROM_CAMPAIGN') && (
            <div>
              <label className="text-sm font-medium mb-2 block">Campaign</label>
              <select
                value={config.campaignId || ''}
                onChange={(e) => {
                  const selectedCampaign = campaigns.find((c) => c.id === e.target.value);
                  setConfig({
                    ...config,
                    campaignId: e.target.value,
                    campaignName: selectedCampaign?.name || '',
                  });
                }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {nodeType === 'EXECUTE_WEBHOOK' && (
            <>
              {/* AI Integration Builder */}
              <div className="border rounded-lg p-4 bg-muted/50 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Webhook Builder</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWebhookAiBuilder(true)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Let AI configure your webhook automatically based on your integration needs
                </p>
              </div>

              {showWebhookAiBuilder && (
                <AiIntegrationBuilder
                  open={showWebhookAiBuilder}
                  onOpenChange={setShowWebhookAiBuilder}
                  integrationType="webhook"
                  context={{
                    contactFields: ['phoneNumber', 'email', 'firstName', 'lastName'],
                    journeyData: { journeyId: journeyId || undefined },
                  }}
                  onConfigGenerated={async (aiConfig) => {
                    try {
                      // Apply AI-generated configuration
                      const newConfig = {
                        ...config,
                        webhookUrl: aiConfig.webhookUrl || config.webhookUrl,
                        webhookMethod: (aiConfig.httpMethod || 'POST') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
                        webhookHeaders: aiConfig.headers || config.webhookHeaders || {},
                        webhookBody: aiConfig.bodyTemplate || config.webhookBody || '{}',
                        webhookRetries: aiConfig.retryConfig?.maxRetries || config.webhookRetries || 3,
                        webhookRetryDelay: aiConfig.retryConfig?.retryDelay || config.webhookRetryDelay || 1000,
                        webhookTimeout: config.webhookTimeout || 30000,
                        webhookResponseHandling: aiConfig.responseHandling || config.webhookResponseHandling,
                      };
                      setConfig(newConfig);
                      setShowWebhookAiBuilder(false);
                      toast.success('Webhook configuration applied! Review and save when ready.');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to apply configuration');
                    }
                  }}
                />
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Webhook</label>
                <select
                  value={config.webhookId || ''}
                  onChange={(e) => {
                    const selectedWebhook = webhooks.find((w) => w.id === e.target.value);
                    setConfig({
                      ...config,
                      webhookId: e.target.value,
                      webhookUrl: selectedWebhook?.url || '',
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select a webhook</option>
                  {webhooks
                    .filter((w) => w.isActive)
                    .map((webhook) => (
                      <option key={webhook.id} value={webhook.id}>
                        {webhook.url}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Or enter a custom webhook URL below
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Custom Webhook URL (Optional)</label>
                <Input
                  type="url"
                  value={config.webhookUrl || ''}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  placeholder="https://example.com/webhook"
                  disabled={!!config.webhookId}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">HTTP Method</label>
                <select
                  value={config.webhookMethod || 'POST'}
                  onChange={(e) => setConfig({ ...config, webhookMethod: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Request Body (JSON)</label>
                <Textarea
                  value={config.webhookBody || '{}'}
                  onChange={(e) => setConfig({ ...config, webhookBody: e.target.value })}
                  placeholder='{"contactId": "{{contactId}}", "phoneNumber": "{{phoneNumber}}"}'
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{'}{'{'}contactId{'}'}{'}'}, {'{'}{'{'}phoneNumber{'}'}{'}'}, {'{'}{'{'}email{'}'}{'}'}, etc. for dynamic values
                </p>
              </div>

              {/* Advanced Webhook Settings */}
              <div className="border-t pt-4 mt-4">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Advanced Settings
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Custom Headers (JSON)</label>
                      <Textarea
                        value={JSON.stringify(config.webhookHeaders || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const headers = JSON.parse(e.target.value || '{}');
                            setConfig({ ...config, webhookHeaders: headers });
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Retry Attempts</label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={config.webhookRetries || 3}
                          onChange={(e) => setConfig({ ...config, webhookRetries: parseInt(e.target.value) || 3 })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Retry Delay (ms)</label>
                        <Input
                          type="number"
                          min="0"
                          value={config.webhookRetryDelay || 1000}
                          onChange={(e) => setConfig({ ...config, webhookRetryDelay: parseInt(e.target.value) || 1000 })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Timeout (ms)</label>
                      <Input
                        type="number"
                        min="1000"
                        value={config.webhookTimeout || 30000}
                        onChange={(e) => setConfig({ ...config, webhookTimeout: parseInt(e.target.value) || 30000 })}
                      />
                    </div>
                  </div>
                </details>
              </div>
            </>
          )}

          {nodeType === 'CONDITION' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Condition Branches</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addConditionBranch}
                  >
                    + Add Branch
                  </Button>
                </div>
                <div className="space-y-4">
                  {(config.branches || []).map((branch: any, index: number) => (
                    <div key={branch.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Input
                          value={branch.label}
                          onChange={(e) =>
                            updateBranch(branch.id, { label: e.target.value })
                          }
                          placeholder="Branch label"
                          className="flex-1 mr-2"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBranch(branch.id)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={branch.condition.field}
                          onChange={(e) =>
                            updateBranch(branch.id, {
                              condition: { ...branch.condition, field: e.target.value },
                            })
                          }
                          className="px-3 py-2 border rounded-md text-sm"
                        >
                          {conditionFields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={branch.condition.operator}
                          onChange={(e) =>
                            updateBranch(branch.id, {
                              condition: { ...branch.condition, operator: e.target.value },
                            })
                          }
                          className="px-3 py-2 border rounded-md text-sm"
                        >
                          {conditionOperators.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        {branch.condition.operator !== 'exists' &&
                          branch.condition.operator !== 'not_exists' && (
                            (() => {
                              const field = conditionFields.find(f => f.value === branch.condition.field);
                              const fieldType = field?.type || 'text';
                              
                              if (fieldType === 'leadStatus') {
                                return (
                                  <select
                                    value={branch.condition.value || ''}
                                    onChange={(e) =>
                                      updateBranch(branch.id, {
                                        condition: { ...branch.condition, value: e.target.value },
                                      })
                                    }
                                    className="px-3 py-2 border rounded-md text-sm"
                                  >
                                    <option value="">Select status</option>
                                    {leadStatusOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                );
                              } else if (fieldType === 'callStatus') {
                                return (
                                  <select
                                    value={branch.condition.value || ''}
                                    onChange={(e) =>
                                      updateBranch(branch.id, {
                                        condition: { ...branch.condition, value: e.target.value },
                                      })
                                    }
                                    className="px-3 py-2 border rounded-md text-sm"
                                  >
                                    <option value="">Select call status</option>
                                    {callStatusOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                );
                              } else if (fieldType === 'boolean') {
                                return (
                                  <select
                                    value={branch.condition.value || ''}
                                    onChange={(e) =>
                                      updateBranch(branch.id, {
                                        condition: { ...branch.condition, value: e.target.value },
                                      })
                                    }
                                    className="px-3 py-2 border rounded-md text-sm"
                                  >
                                    <option value="">Select value</option>
                                    {booleanOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                );
                              } else {
                                return (
                                  <Input
                                    value={branch.condition.value || ''}
                                    onChange={(e) =>
                                      updateBranch(branch.id, {
                                        condition: { ...branch.condition, value: e.target.value },
                                      })
                                    }
                                    placeholder="Value"
                                    className="text-sm"
                                  />
                                );
                              }
                            })()
                          )}
                        {(branch.condition.operator === 'exists' ||
                          branch.condition.operator === 'not_exists') && (
                          <div className="col-span-1"></div>
                        )}
                      </div>
                      {branch.condition.field === 'message.receivedInCampaign' && (
                        <div>
                          <label className="text-xs font-medium mb-1 block">Campaign</label>
                          <select
                            value={branch.condition.campaignId || ''}
                            onChange={(e) =>
                              updateBranch(branch.id, {
                                condition: { ...branch.condition, campaignId: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            <option value="">Select campaign</option>
                            {campaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Next Node</label>
                        <select
                          value={branch.nextNodeId || ''}
                          onChange={(e) =>
                            updateBranch(branch.id, { nextNodeId: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">Select next node</option>
                          {availableNodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.data?.label || n.data?.type || n.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {(!config.branches || config.branches.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      No branches configured. Click &quot;Add Branch&quot; to create a condition branch.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Default Branch (if no conditions match)</label>
                <select
                  value={config.defaultBranch?.nextNodeId || ''}
                  onChange={(e) => {
                    const nextNodeId = e.target.value || undefined;
                    const updatedConfig = {
                      ...config,
                      defaultBranch: { ...config.defaultBranch, nextNodeId },
                    };
                    setConfig(updatedConfig);
                    
                    // Update edges
                    setEdges((eds) => {
                      // Remove old default branch edge
                      const withoutOldEdge = eds.filter(
                        (e) => !(e.source === node.id && e.sourceHandle === 'default')
                      );
                      
                      // Add new edge if nextNodeId is set
                      if (nextNodeId) {
                        return [
                          ...withoutOldEdge,
                          {
                            id: `edge-${node.id}-${nextNodeId}-default`,
                            source: node.id,
                            sourceHandle: 'default',
                            target: nextNodeId,
                            type: 'smoothstep',
                            animated: true,
                            style: {
                              strokeWidth: 2,
                              stroke: '#94a3b8',
                            },
                            label: 'Default',
                            labelStyle: { fill: '#64748b', fontWeight: 500 },
                          },
                        ];
                      }
                      
                      return withoutOldEdge;
                    });
                    
                    // Update node connections in state
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === node.id
                          ? {
                              ...n,
                              data: {
                                ...n.data,
                                config: updatedConfig,
                              },
                            }
                          : n
                      )
                    );
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">No default (end journey)</option>
                  {availableNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.data?.label || n.data?.type || n.id}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {nodeType === 'TIME_DELAY' && (
            <>
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Delay Type</label>
                <select
                  value={config.delayAtTime ? 'specific' : 'relative'}
                  onChange={(e) => {
                    if (e.target.value === 'specific') {
                      setConfig({ ...config, delayValue: undefined, delayUnit: undefined, delayAtTime: config.delayAtTime || '09:00' });
                    } else {
                      // Ensure default values are set when switching to relative
                      setConfig({ ...config, delayAtTime: undefined, delayValue: config.delayValue ?? 1, delayUnit: config.delayUnit || 'MINUTES' });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="relative">Relative Delay</option>
                  <option value="specific">Specific Time</option>
                </select>
              </div>
              
              {config.delayAtTime ? (
                <div>
                  <label className="text-sm font-medium mb-2 block">Schedule at Specific Time</label>
                  <Input
                    type="time"
                    value={config.delayAtTime || ''}
                    onChange={(e) => setConfig({ ...config, delayAtTime: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Messages will be sent at this time each day</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Delay Value</label>
                    <Input
                      type="number"
                      value={config.delayValue ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        setConfig({ ...config, delayValue: value });
                      }}
                      placeholder="1"
                      min="0"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Unit</label>
                    <select
                      value={config.delayUnit || 'MINUTES'}
                      onChange={(e) => setConfig({ ...config, delayUnit: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="MINUTES">Minutes</option>
                      <option value="HOURS">Hours</option>
                      <option value="DAYS">Days</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {nodeType === 'MAKE_CALL' && (
            <>
              {/* Journey Audio Files Section */}
              {templatesWithJourney.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <label className="text-sm font-medium mb-2 block">Journey Audio Files</label>
                  <select
                    value={selectedContentAiTemplateId || ''}
                    onChange={(e) => {
                      const templateId = e.target.value || null;
                      setSelectedContentAiTemplateId(templateId);
                      // Clear journey audio selection when template changes
                      if (!templateId) {
                        setConfig({ ...config, journeyAudioId: undefined });
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md mb-2"
                  >
                    <option value="">Select Content AI Template...</option>
                    {templatesWithJourney.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  
                  {selectedContentAiTemplateId && journeyAudioFiles.length > 0 && (
                    <div className="mt-2">
                      <select
                        value={config.journeyAudioId || ''}
                        onChange={(e) => {
                          const audioId = e.target.value || undefined;
                          const selectedAudio = journeyAudioFiles.find(a => a.id === audioId);
                          setConfig({ 
                            ...config, 
                            journeyAudioId: audioId,
                            audioFile: selectedAudio?.metadata?.asteriskPath || config.audioFile,
                            voiceTemplateId: undefined, // Clear voice template when using journey audio
                          });
                        }}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="">Select Journey Audio...</option>
                        {journeyAudioFiles.map((audio) => (
                          <option key={audio.id} value={audio.id}>
                            Day {audio.day}, Call {audio.callNumber}
                            {audio.characterIndex !== undefined && audio.totalCharacters ? ` (Character ${audio.characterIndex + 1}/${audio.totalCharacters})` : ''}
                            {audio.durationSeconds ? ` - ${Math.round(audio.durationSeconds)}s` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select a generated journey audio file. These are AI-generated audio files based on your journey description.
                      </p>
                    </div>
                  )}
                  
                  {selectedContentAiTemplateId && journeyAudioFiles.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No journey audio files generated yet. Generate audio files using the Content AI template.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Audio File (IVR)</label>
                <select
                  value={config.audioFile || ''}
                  onChange={(e) => {
                    setConfig({ 
                      ...config, 
                      audioFile: e.target.value || undefined,
                      journeyAudioId: undefined, // Clear journey audio when using static file
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!!config.journeyAudioId}
                >
                  <option value="">None - Use template below</option>
                  {voiceAudioFiles?.map((file) => (
                    <option key={file.name} value={file.name}>
                      {file.name} ({file.format})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select an audio file from voice sounds directory to play as IVR message
                  {config.journeyAudioId && ' (disabled when using journey audio)'}
                </p>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Voice Template (Optional)</label>
                <div className="flex gap-2">
                  <select
                    value={config.voiceTemplateId || ''}
                    onChange={(e) => {
                      // Clean up blob URL before clearing
                      if (previewAudioUrl && previewAudioUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(previewAudioUrl);
                      }
                      setConfig({ 
                        ...config, 
                        voiceTemplateId: e.target.value || undefined,
                        journeyAudioId: undefined, // Clear journey audio when using voice template
                      });
                      setPreviewAudioUrl(null); // Clear preview when template changes
                    }}
                    disabled={!!config.journeyAudioId}
                    className="flex-1 px-3 py-2 border rounded-md"
                  >
                    <option value="">None - Use audio file above</option>
                    {voiceTemplates?.filter(t => t.isActive).map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {config.voiceTemplateId && (
                    <button
                      type="button"
                      onClick={handlePreviewVoiceTemplate}
                      disabled={isGeneratingPreview}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isGeneratingPreview ? 'Generating...' : 'Preview'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select a voice template to generate personalized audio messages. If selected, template will be used instead of audio file.
                </p>
                {previewAudioUrl && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs font-medium mb-2">Preview Audio:</p>
                    <audio controls src={previewAudioUrl} className="w-full" preload="auto">
                      Your browser does not support the audio element.
                    </audio>
                    {selectedVoiceTemplate.data && (
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Template:</strong> {selectedVoiceTemplate.data.name}
                        {selectedVoiceTemplate.data.messageContent && (
                          <>
                            <br />
                            <strong>Message:</strong> {selectedVoiceTemplate.data.messageContent}
                          </>
                        )}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (previewAudioUrl) {
                          URL.revokeObjectURL(previewAudioUrl);
                        }
                        setPreviewAudioUrl(null);
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Clear Preview
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">DID Pool Type</label>
                <select
                  value={config.didPoolType || 'MC'}
                  onChange={(e) => {
                    const newPoolType = e.target.value as 'MC' | 'Twilio';
                    setConfig({ 
                      ...config, 
                      didPoolType: newPoolType,
                      didId: undefined, // Clear DID selection when pool type changes
                      didSegment: undefined, // Clear segment selection when pool type changes
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="MC">MC Pool (Default)</option>
                  <option value="Twilio">Twilio Pool</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select which DID pool to use. MC uses the default trunk, Twilio uses Twilio trunk.
                </p>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">DID Segment (Optional)</label>
                <select
                  value={config.didSegment || ''}
                  onChange={(e) => setConfig({ ...config, didSegment: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!config.didPoolType}
                >
                  <option value="">Use automatic rotation from pool</option>
                  {config.didPoolType === 'Twilio' && didPools?.twilio.segments.map((segment) => (
                    <option key={segment} value={segment}>
                      {segment} ({didPools.twilio.dids.filter((d: any) => d.segment === segment).length} DIDs)
                    </option>
                  ))}
                  {config.didPoolType === 'MC' && didPools?.mc.segments.map((segment) => (
                    <option key={segment} value={segment}>
                      {segment} ({didPools.mc.dids.filter((d: any) => d.segment === segment).length} DIDs)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Optionally select a specific segment within the pool for rotation.
                </p>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Specific DID (Optional)</label>
                <select
                  value={config.didId || ''}
                  onChange={(e) => setConfig({ ...config, didId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!config.didPoolType}
                >
                  <option value="">Use automatic rotation</option>
                  {filteredDids?.map((did) => (
                    <option key={did.id} value={did.id}>
                      {did.number} ({did.trunk || 'MC'}) - Usage: {did.usageCount || 0}{did.maxUsage ? `/${did.maxUsage}` : ''}
                      {did.segment ? ` - ${did.segment}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a specific DID from the {config.didPoolType || 'MC'} pool, or leave empty for automatic rotation.
                  {didPools && config.didPoolType && (
                    <span className="block mt-1">
                      {config.didPoolType === 'Twilio' 
                        ? `${didPools.twilio.count} Twilio DIDs available`
                        : `${didPools.mc.count} MC DIDs available`}
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Transfer Number</label>
                <Input
                  type="tel"
                  value={config.transferNumber || ''}
                  onChange={(e) => setConfig({ ...config, transferNumber: e.target.value || undefined })}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phone number to transfer the call to when user presses the transfer key (default: same as caller ID)
                </p>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.enableVmFile || false}
                    onChange={(e) => setConfig({ ...config, enableVmFile: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Enable Voicemail File</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Enable voicemail audio file playback if call is not answered. Uses the same audio file selected above.
                </p>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.recordCall || false}
                    onChange={(e) => setConfig({ ...config, recordCall: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Record Call</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Record the call for quality assurance and compliance. Calls are recorded via the voice system.
                </p>
              </div>
            </>
          )}

          {nodeType === 'WEIGHTED_PATH' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Weighted Paths</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPath = {
                        id: `path_${Date.now()}`,
                        label: `Path ${(config.paths?.length || 0) + 1}`,
                        percentage: 0,
                        nextNodeId: '',
                      };
                      setConfig({
                        ...config,
                        paths: [...(config.paths || []), newPath],
                      });
                    }}
                  >
                    + Add Path
                  </Button>
                </div>
                <div className="space-y-4">
                  {(config.paths || []).map((path: any, index: number) => {
                    const totalPercentage = (config.paths || []).reduce((sum: number, p: any) => sum + (p.percentage || 0), 0);
                    return (
                      <div key={path.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={path.label}
                            onChange={(e) => {
                              const updatedPaths = (config.paths || []).map((p: any) =>
                                p.id === path.id ? { ...p, label: e.target.value } : p
                              );
                              setConfig({ ...config, paths: updatedPaths });
                            }}
                            placeholder="Path label"
                            className="flex-1 mr-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfig({
                                ...config,
                                paths: (config.paths || []).filter((p: any) => p.id !== path.id),
                              });
                            }}
                            disabled={(config.paths || []).length <= 2}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium mb-1 block">Percentage</label>
                            <Input
                              type="number"
                              value={path.percentage || 0}
                              onChange={(e) => {
                                const newPercentage = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                const updatedPaths = (config.paths || []).map((p: any) =>
                                  p.id === path.id ? { ...p, percentage: newPercentage } : p
                                );
                                setConfig({ ...config, paths: updatedPaths });
                              }}
                              min="0"
                              max="100"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Next Node</label>
                            <select
                              value={path.nextNodeId || ''}
                              onChange={(e) => {
                                const updatedPaths = (config.paths || []).map((p: any) =>
                                  p.id === path.id ? { ...p, nextNodeId: e.target.value } : p
                                );
                                setConfig({ ...config, paths: updatedPaths });
                              }}
                              className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                              <option value="">Select next node</option>
                              {availableNodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.data?.label || n.data?.type || n.id}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {totalPercentage !== 100 && (
                          <p className="text-xs text-amber-600">
                            Total percentage: {totalPercentage}% (should be 100%)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(!config.paths || config.paths.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No paths configured. Click &quot;Add Path&quot; to create weighted paths.
                  </div>
                )}
              </div>
            </>
          )}

          {nodeType === 'UPDATE_CONTACT_STATUS' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Lead Status</label>
              <select
                value={config.leadStatus || ''}
                onChange={(e) => setConfig({ ...config, leadStatus: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a status</option>
                {leadStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                This will update the contact&apos;s lead status when this node executes
              </p>
            </div>
          )}
      </div>

      {/* Output Connections Section - for nodes with multiple outputs */}
      {(() => {
        // SIMPLIFIED: All nodes use single nextNodeId connection (except CONDITION/WEIGHTED_PATH)
        const hasMultipleOutputs = false; // Removed multiple outputs system
        
        if (!hasMultipleOutputs) return null;
        
        const currentOutputs = connections.outputs || {};
        
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/60 backdrop-blur-sm p-5 rounded-xl border border-slate-200/60 shadow-sm"
          >
            <label className="text-sm font-bold mb-3 block text-slate-900">Next Node Connection</label>
            <p className="text-xs text-slate-600 mb-4 font-medium">
              Connect this node to the next node in the journey
            </p>
            
            {/* Simple single connection dropdown */}
            <div>
              <label className="text-xs font-medium mb-1 block text-slate-700">
                Next Node
              </label>
              <select
                value={connections.nextNodeId || ''}
                onChange={(e) => {
                  const targetNodeId = e.target.value || undefined;
                  const updatedConnections = {
                    ...connections,
                    nextNodeId: targetNodeId,
                  };
                  
                  // Update local connections state
                  setConnections(updatedConnections);
                  
                  // Update node state
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              connections: updatedConnections,
                            },
                          }
                        : n
                    )
                  );
                  
                  // Update edges - remove all old edges from this node, add new one
                  setEdges((eds) => {
                    // Remove all edges from this node
                    const withoutOldEdges = eds.filter((e) => e.source !== node.id);
                    
                    // Add new edge if target selected
                    if (targetNodeId) {
                      return [
                        ...withoutOldEdges,
                        {
                          id: `edge-${node.id}-${targetNodeId}`,
                          source: node.id,
                          target: targetNodeId,
                          type: 'smoothstep',
                          animated: true,
                          style: {
                            strokeWidth: 2,
                            stroke: '#94a3b8',
                          },
                        },
                      ];
                    }
                    
                    return withoutOldEdges;
                  });
                }}
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
              >
                <option value="">No connection</option>
                {availableNodes.map((targetNode) => (
                  <option key={targetNode.id} value={targetNode.id}>
                    {targetNode.data?.label || targetNode.data?.type || targetNode.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Select the next node to execute after this node completes
              </p>
            </div>
          </motion.div>
        );
      })()}

      {/* Simple Footer */}
      <div className="border-t border-slate-200 bg-white p-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-slate-800 hover:bg-slate-900 text-white"
        >
          Save Configuration
        </Button>
      </div>
    </div>
  );
}

