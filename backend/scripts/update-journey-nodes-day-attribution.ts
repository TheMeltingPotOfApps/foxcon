/**
 * Migration script to update existing journey nodes with proper day attribution
 * 
 * This script:
 * 1. Loads all journeys and their nodes
 * 2. Calculates day attribution for nodes that don't have explicit day assignment
 * 3. Ensures TIME_DELAY nodes are properly attributed to days
 * 4. Updates nodes with day property in config
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Journey } from '../src/entities/journey.entity';
import { JourneyNode, JourneyNodeType, TimeDelayUnit } from '../src/entities/journey-node.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Calculate nodes by day using the same logic as the frontend
 * This ensures consistency between frontend display and backend data
 */
function calculateNodesByDay(nodes: JourneyNode[]): Map<number, JourneyNode[]> {
  const nodesByDay = new Map<number, JourneyNode[]>();
  
  if (nodes.length === 0) return nodesByDay;
  
  // Method 1: Check for explicit day in config
  const nodesWithExplicitDay: JourneyNode[] = [];
  const nodesWithoutDay: JourneyNode[] = [];
  
  nodes.forEach(node => {
    const day = node.config?.day;
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

  // Method 2: If nodes don't have explicit day, infer from TIME_DELAY nodes with DAYS unit
  if (nodesWithoutDay.length > 0) {
    const nodeMap = new Map<string, JourneyNode>();
    // Include all nodes in map for connection traversal
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Build a graph to find root nodes and traverse
    // Find root nodes from nodesWithoutDay (nodes with no incoming connections)
    const rootNodes = nodesWithoutDay.filter(node => {
      // Check connections from ALL nodes (including those with explicit days)
      return !nodes.some(n => {
        // Check connections
        if (n.connections?.nextNodeId === node.id) {
          return true;
        }
        if (n.connections?.outputs) {
          return Object.values(n.connections.outputs).includes(node.id);
        }
        // Check CONDITION branches
        if (n.type === JourneyNodeType.CONDITION && n.config?.branches) {
          return n.config.branches.some((b: any) => b.nextNodeId === node.id);
        }
        // Check WEIGHTED_PATH paths
        if (n.type === JourneyNodeType.WEIGHTED_PATH && n.config?.paths) {
          return n.config.paths.some((p: any) => p.nextNodeId === node.id);
        }
        return false;
      });
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
      const explicitDay = node.config?.day;
      if (explicitDay !== undefined && typeof explicitDay === 'number') {
        // Node already has explicit day, skip but still traverse from it
        // Use explicit day for calculating next day increment
        let dayIncrement = 0;
        if (node.type === JourneyNodeType.TIME_DELAY && node.config?.delayUnit === TimeDelayUnit.DAYS) {
          dayIncrement = node.config.delayValue || 0;
        }
        const nextDay = explicitDay + dayIncrement;
        
        // Find next nodes and continue traversal
        const nextNodeIds: string[] = [];
        if (node.connections?.nextNodeId && !nextNodeIds.includes(node.connections.nextNodeId)) {
          nextNodeIds.push(node.connections.nextNodeId);
        }
        if (node.connections?.outputs) {
          Object.values(node.connections.outputs).forEach((id) => {
            if (typeof id === 'string' && !nextNodeIds.includes(id)) {
              nextNodeIds.push(id);
            }
          });
        }
        if (node.type === JourneyNodeType.CONDITION && node.config?.branches) {
          node.config.branches.forEach((b: any) => {
            if (b.nextNodeId && !nextNodeIds.includes(b.nextNodeId)) {
              nextNodeIds.push(b.nextNodeId);
            }
          });
          if (node.config.defaultBranch?.nextNodeId && !nextNodeIds.includes(node.config.defaultBranch.nextNodeId)) {
            nextNodeIds.push(node.config.defaultBranch.nextNodeId);
          }
        }
        if (node.type === JourneyNodeType.WEIGHTED_PATH && node.config?.paths) {
          node.config.paths.forEach((p: any) => {
            if (p.nextNodeId && !nextNodeIds.includes(p.nextNodeId)) {
              nextNodeIds.push(p.nextNodeId);
            }
          });
        }
        
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
      
      if (node.type === JourneyNodeType.TIME_DELAY && node.config?.delayUnit === TimeDelayUnit.DAYS) {
        // TIME_DELAY nodes with DAYS unit mark the end of the current day
        // They stay in the current day, but increment for next nodes
        dayIncrement = node.config.delayValue || 0;
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
      // Nodes that come AFTER a TIME_DELAY with DAYS unit will be in nextDay
      const nextDay = day + dayIncrement;
      const nextNodeIds: string[] = [];
      
      // Find next nodes from connections
      if (node.connections?.nextNodeId) {
        if (!nextNodeIds.includes(node.connections.nextNodeId)) {
          nextNodeIds.push(node.connections.nextNodeId);
        }
      }
      if (node.connections?.outputs) {
        Object.values(node.connections.outputs).forEach((id) => {
          if (typeof id === 'string' && !nextNodeIds.includes(id)) {
            nextNodeIds.push(id);
          }
        });
      }
      if (node.type === JourneyNodeType.CONDITION && node.config?.branches) {
        node.config.branches.forEach((b: any) => {
          if (b.nextNodeId && !nextNodeIds.includes(b.nextNodeId)) {
            nextNodeIds.push(b.nextNodeId);
          }
        });
        if (node.config.defaultBranch?.nextNodeId && !nextNodeIds.includes(node.config.defaultBranch.nextNodeId)) {
          nextNodeIds.push(node.config.defaultBranch.nextNodeId);
        }
      }
      if (node.type === JourneyNodeType.WEIGHTED_PATH && node.config?.paths) {
        node.config.paths.forEach((p: any) => {
          if (p.nextNodeId && !nextNodeIds.includes(p.nextNodeId)) {
            nextNodeIds.push(p.nextNodeId);
          }
        });
      }
      
      nextNodeIds.forEach(nextId => {
        if (!visited.has(nextId) && nodeMap.has(nextId)) {
          queue.push({ nodeId: nextId, day: nextDay });
        }
      });
    }
    
    // Assign remaining unvisited nodes to day 1
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

async function updateJourneyNodes() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'sms_user',
    password: process.env.DB_PASSWORD || 'sms_password',
    database: process.env.DB_DATABASE || 'sms_platform',
    entities: [
      path.join(__dirname, '../src/entities/*.entity{.ts,.js}'),
      path.join(__dirname, '../dist/src/entities/*.entity{.ts,.js}'),
    ],
    synchronize: false,
    logging: false,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const journeyRepository = dataSource.getRepository(Journey);
    const nodeRepository = dataSource.getRepository(JourneyNode);

    // Load all journeys with their nodes
    const journeys = await journeyRepository.find({
      relations: ['nodes'],
    });

    console.log(`📊 Found ${journeys.length} journeys to process`);

    let updatedJourneys = 0;
    let updatedNodes = 0;
    let skippedJourneys = 0;

    for (const journey of journeys) {
      if (!journey.nodes || journey.nodes.length === 0) {
        skippedJourneys++;
        continue;
      }

      // Calculate days for all nodes
      const nodesByDay = calculateNodesByDay(journey.nodes);
      
      // Check if any nodes need updating
      let needsUpdate = false;
      const nodesToUpdate: JourneyNode[] = [];

      for (const [day, dayNodes] of nodesByDay.entries()) {
        for (const node of dayNodes) {
          const currentDay = node.config?.day;
          
          // Update if:
          // 1. Node doesn't have a day assigned
          // 2. Node has wrong day assigned
          // 3. TIME_DELAY node doesn't have day in config
          if (currentDay !== day || (node.type === JourneyNodeType.TIME_DELAY && !node.config?.day)) {
            needsUpdate = true;
            node.config = {
              ...node.config,
              day,
            };
            nodesToUpdate.push(node);
          }
        }
      }

      if (needsUpdate) {
        // Save updated nodes
        await nodeRepository.save(nodesToUpdate);
        updatedNodes += nodesToUpdate.length;
        updatedJourneys++;
        console.log(`✅ Updated journey "${journey.name}" (${journey.id}): ${nodesToUpdate.length} nodes updated`);
      } else {
        skippedJourneys++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedJourneys} journeys, ${updatedNodes} nodes`);
    console.log(`   ⏭️  Skipped: ${skippedJourneys} journeys (already up to date or no nodes)`);
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run migration
updateJourneyNodes()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

