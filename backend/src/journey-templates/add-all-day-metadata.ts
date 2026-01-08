// Script to add day metadata to all nodes in the 5-day template
// This ensures all nodes have proper day markers

export function addDayMetadataToAllNodes(nodes: any[]): any[] {
  const dayMap: Record<string, number> = {
    // Day 1
    'node-2': 1, 'node-3': 1, 'node-4': 1, 'sms-1': 1, 'call-1-2': 1,
    // Day 2
    'node-5': 2, 'node-6': 2, 'node-7': 2, 'node-8': 2, 'sms-2': 2, 'call-2-2': 2,
    // Day 3
    'node-9': 3, 'node-10': 3, 'node-11': 3, 'node-12': 3, 'sms-3': 3, 'call-3-2': 3,
    // Day 4
    'node-13': 4, 'node-14': 4, 'node-15': 4, 'node-16': 4, 'sms-4': 4, 'call-4-2': 4,
    // Day 5
    'node-17': 5, 'node-18': 5, 'node-19': 5, 'node-20': 5, 'node-21': 5, 'sms-5': 5, 'call-5-2': 5, 'call-5-3': 5,
  };

  return nodes.map(node => {
    const day = dayMap[node.id];
    if (day !== undefined) {
      return {
        ...node,
        config: {
          ...node.config,
          day,
        },
        metadata: {
          ...(node.metadata || {}),
          day,
        },
      };
    }
    return node;
  });
}

