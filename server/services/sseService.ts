import { Response } from 'express';

export interface SSEClient {
  id: string;
  response: Response;
  topics: Set<string>;
  lastPing: number;
}

export class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    // Send heartbeat every 30 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  addClient(clientId: string, response: Response, topics: string[] = []): void {
    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    this.sendEvent(response, 'connected', { clientId, topics });

    // Store client
    this.clients.set(clientId, {
      id: clientId,
      response,
      topics: new Set(topics),
      lastPing: Date.now()
    });

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(clientId);
    });

    response.on('error', () => {
      this.removeClient(clientId);
    });
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (error) {
        // Client already disconnected
      }
      this.clients.delete(clientId);
    }
  }

  sendToTopic(topic: string, event: string, data: any): void {
    const clients = Array.from(this.clients.values()).filter(
      client => client.topics.has(topic) || client.topics.has('*')
    );

    clients.forEach(client => {
      try {
        this.sendEvent(client.response, event, data);
      } catch (error) {
        // Remove client if sending fails
        this.removeClient(client.id);
      }
    });
  }

  sendToClient(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        this.sendEvent(client.response, event, data);
      } catch (error) {
        this.removeClient(clientId);
      }
    }
  }

  broadcast(event: string, data: any): void {
    this.clients.forEach(client => {
      try {
        this.sendEvent(client.response, event, data);
      } catch (error) {
        this.removeClient(client.id);
      }
    });
  }

  private sendEvent(response: Response, event: string, data: any): void {
    const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    response.write(eventData);
  }

  private sendHeartbeat(): void {
    const now = Date.now();
    const heartbeatData = { timestamp: now };

    this.clients.forEach((client, clientId) => {
      try {
        this.sendEvent(client.response, 'heartbeat', heartbeatData);
        client.lastPing = now;
      } catch (error) {
        this.removeClient(clientId);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientsByTopic(topic: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      client => client.topics.has(topic) || client.topics.has('*')
    );
  }

  subscribeClient(clientId: string, topic: string): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.topics.add(topic);
      return true;
    }
    return false;
  }

  unsubscribeClient(clientId: string, topic: string): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.topics.delete(topic);
      return true;
    }
    return false;
  }

  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.forEach(client => {
      try {
        client.response.end();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.clients.clear();
  }
}










