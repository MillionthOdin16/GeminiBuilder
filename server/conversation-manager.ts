/**
 * Conversation Manager - Manage chat conversations
 * 
 * Handles saving, loading, and organizing conversations
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { randomUUID } from 'crypto';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    toolResult?: unknown;
    error?: boolean;
    tokens?: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created: Date;
  updated: Date;
  projectPath?: string;
  model?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  tokenCount?: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  created: Date;
  updated: Date;
  projectPath?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
}

export interface ConversationFilter {
  projectPath?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class ConversationManager {
  private conversationsDir: string;
  private indexPath: string;
  private index: Map<string, ConversationSummary> = new Map();

  constructor() {
    const configDir = path.join(os.homedir(), '.gemini');
    this.conversationsDir = path.join(configDir, 'conversations');
    this.indexPath = path.join(this.conversationsDir, 'index.json');
  }

  /**
   * Initialize conversation manager
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.conversationsDir, { recursive: true });
      await this.loadIndex();
    } catch (error) {
      console.error('Failed to initialize conversation manager:', error);
    }
  }

  /**
   * Load conversation index
   */
  private async loadIndex(): Promise<void> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      const entries: ConversationSummary[] = JSON.parse(content);
      this.index = new Map(entries.map(e => [e.id, e]));
    } catch {
      this.index = new Map();
    }
  }

  /**
   * Save conversation index
   */
  private async saveIndex(): Promise<void> {
    const entries = Array.from(this.index.values());
    await fs.writeFile(this.indexPath, JSON.stringify(entries, null, 2));
  }

  /**
   * Create a new conversation
   */
  async create(options: {
    title?: string;
    projectPath?: string;
    model?: string;
  } = {}): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();

    const conversation: Conversation = {
      id,
      title: options.title || 'New Conversation',
      messages: [],
      created: now,
      updated: now,
      projectPath: options.projectPath,
      model: options.model,
      tags: [],
      starred: false,
      archived: false,
      tokenCount: 0,
    };

    // Save conversation file
    await this.saveConversation(conversation);

    // Update index
    this.index.set(id, {
      id,
      title: conversation.title,
      messageCount: 0,
      created: now,
      updated: now,
      projectPath: options.projectPath,
      tags: [],
      starred: false,
      archived: false,
    });
    await this.saveIndex();

    return conversation;
  }

  /**
   * Get conversation file path
   */
  private getFilePath(id: string): string {
    return path.join(this.conversationsDir, `${id}.json`);
  }

  /**
   * Save conversation to file
   */
  private async saveConversation(conversation: Conversation): Promise<void> {
    const filePath = this.getFilePath(conversation.id);
    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
  }

  /**
   * Load a conversation
   */
  async load(id: string): Promise<Conversation | null> {
    try {
      const filePath = this.getFilePath(id);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const conversation = await this.load(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const newMessage: ChatMessage = {
      ...message,
      id: randomUUID(),
      timestamp: new Date(),
    };

    conversation.messages.push(newMessage);
    conversation.updated = new Date();

    // Update token count estimate (rough)
    if (message.content) {
      conversation.tokenCount = (conversation.tokenCount || 0) + Math.ceil(message.content.length / 4);
    }

    // Update title if first user message
    if (message.role === 'user' && conversation.messages.filter(m => m.role === 'user').length === 1) {
      conversation.title = this.generateTitle(message.content);
    }

    await this.saveConversation(conversation);

    // Update index
    const summary = this.index.get(conversationId);
    if (summary) {
      summary.messageCount = conversation.messages.length;
      summary.updated = conversation.updated;
      summary.title = conversation.title;
      await this.saveIndex();
    }

    return newMessage;
  }

  /**
   * Generate title from message content
   */
  private generateTitle(content: string): string {
    // Take first 50 chars of first line
    const firstLine = content.split('\n')[0];
    if (firstLine.length <= 50) {
      return firstLine;
    }
    return firstLine.slice(0, 47) + '...';
  }

  /**
   * Update conversation metadata
   */
  async update(
    id: string,
    updates: Partial<Pick<Conversation, 'title' | 'tags' | 'starred' | 'archived'>>
  ): Promise<void> {
    const conversation = await this.load(id);
    if (!conversation) {
      throw new Error(`Conversation not found: ${id}`);
    }

    if (updates.title !== undefined) conversation.title = updates.title;
    if (updates.tags !== undefined) conversation.tags = updates.tags;
    if (updates.starred !== undefined) conversation.starred = updates.starred;
    if (updates.archived !== undefined) conversation.archived = updates.archived;
    conversation.updated = new Date();

    await this.saveConversation(conversation);

    // Update index
    const summary = this.index.get(id);
    if (summary) {
      if (updates.title !== undefined) summary.title = updates.title;
      if (updates.tags !== undefined) summary.tags = updates.tags;
      if (updates.starred !== undefined) summary.starred = updates.starred;
      if (updates.archived !== undefined) summary.archived = updates.archived;
      summary.updated = conversation.updated;
      await this.saveIndex();
    }
  }

  /**
   * Delete a conversation
   */
  async delete(id: string): Promise<void> {
    try {
      const filePath = this.getFilePath(id);
      await fs.unlink(filePath);
    } catch {
      // File might not exist
    }

    this.index.delete(id);
    await this.saveIndex();
  }

  /**
   * List conversations with optional filtering
   */
  async list(filter?: ConversationFilter): Promise<ConversationSummary[]> {
    await this.loadIndex();
    
    let results = Array.from(this.index.values());

    if (filter) {
      // Filter by project
      if (filter.projectPath) {
        results = results.filter(c => c.projectPath === filter.projectPath);
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(c =>
          filter.tags!.some(tag => c.tags?.includes(tag))
        );
      }

      // Filter by starred
      if (filter.starred !== undefined) {
        results = results.filter(c => c.starred === filter.starred);
      }

      // Filter by archived
      if (filter.archived !== undefined) {
        results = results.filter(c => c.archived === filter.archived);
      } else {
        // By default, hide archived
        results = results.filter(c => !c.archived);
      }

      // Filter by date range
      if (filter.dateFrom) {
        results = results.filter(c => new Date(c.created) >= filter.dateFrom!);
      }
      if (filter.dateTo) {
        results = results.filter(c => new Date(c.created) <= filter.dateTo!);
      }

      // Filter by search
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        results = results.filter(c =>
          c.title.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sort by updated date, newest first
    return results.sort((a, b) =>
      new Date(b.updated).getTime() - new Date(a.updated).getTime()
    );
  }

  /**
   * Search within conversation messages
   */
  async search(query: string, limit: number = 50): Promise<{
    conversationId: string;
    messageId: string;
    content: string;
    timestamp: Date;
  }[]> {
    const results: {
      conversationId: string;
      messageId: string;
      content: string;
      timestamp: Date;
    }[] = [];

    const queryLower = query.toLowerCase();

    // Search all conversations
    for (const [id] of this.index) {
      const conversation = await this.load(id);
      if (!conversation) continue;

      for (const message of conversation.messages) {
        if (message.content.toLowerCase().includes(queryLower)) {
          results.push({
            conversationId: id,
            messageId: message.id,
            content: message.content,
            timestamp: message.timestamp,
          });

          if (results.length >= limit) {
            return results;
          }
        }
      }
    }

    return results;
  }

  /**
   * Export conversation to markdown
   */
  async exportToMarkdown(id: string): Promise<string> {
    const conversation = await this.load(id);
    if (!conversation) {
      throw new Error(`Conversation not found: ${id}`);
    }

    let markdown = `# ${conversation.title}\n\n`;
    markdown += `*Created: ${new Date(conversation.created).toLocaleString()}*\n`;
    markdown += `*Updated: ${new Date(conversation.updated).toLocaleString()}*\n\n`;

    if (conversation.tags && conversation.tags.length > 0) {
      markdown += `Tags: ${conversation.tags.join(', ')}\n\n`;
    }

    markdown += '---\n\n';

    for (const message of conversation.messages) {
      const roleLabel = {
        user: '**You:**',
        assistant: '**Assistant:**',
        system: '**System:**',
        tool: `**Tool (${message.metadata?.toolName || 'unknown'}):**`,
      }[message.role];

      markdown += `${roleLabel}\n\n${message.content}\n\n`;
    }

    return markdown;
  }

  /**
   * Export conversation to JSON
   */
  async exportToJson(id: string): Promise<string> {
    const conversation = await this.load(id);
    if (!conversation) {
      throw new Error(`Conversation not found: ${id}`);
    }
    return JSON.stringify(conversation, null, 2);
  }

  /**
   * Import conversation from JSON
   */
  async importFromJson(json: string): Promise<Conversation> {
    const data = JSON.parse(json);
    
    // Generate new ID to avoid conflicts
    const newId = randomUUID();
    const now = new Date();

    const conversation: Conversation = {
      ...data,
      id: newId,
      created: now,
      updated: now,
    };

    await this.saveConversation(conversation);

    this.index.set(newId, {
      id: newId,
      title: conversation.title,
      messageCount: conversation.messages.length,
      created: now,
      updated: now,
      projectPath: conversation.projectPath,
      tags: conversation.tags,
      starred: conversation.starred,
      archived: conversation.archived,
    });
    await this.saveIndex();

    return conversation;
  }

  /**
   * Duplicate a conversation
   */
  async duplicate(id: string): Promise<Conversation> {
    const original = await this.load(id);
    if (!original) {
      throw new Error(`Conversation not found: ${id}`);
    }

    const newId = randomUUID();
    const now = new Date();

    const conversation: Conversation = {
      ...original,
      id: newId,
      title: `${original.title} (copy)`,
      created: now,
      updated: now,
    };

    await this.saveConversation(conversation);

    this.index.set(newId, {
      id: newId,
      title: conversation.title,
      messageCount: conversation.messages.length,
      created: now,
      updated: now,
      projectPath: conversation.projectPath,
      tags: conversation.tags,
      starred: conversation.starred,
      archived: false,
    });
    await this.saveIndex();

    return conversation;
  }

  /**
   * Get all tags used in conversations
   */
  async getAllTags(): Promise<string[]> {
    const tagSet = new Set<string>();
    
    for (const summary of this.index.values()) {
      if (summary.tags) {
        summary.tags.forEach(tag => tagSet.add(tag));
      }
    }

    return Array.from(tagSet).sort();
  }

  /**
   * Delete old archived conversations
   */
  async cleanupOldConversations(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAge);
    let deleted = 0;

    for (const summary of this.index.values()) {
      if (summary.archived && new Date(summary.updated) < cutoff) {
        await this.delete(summary.id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    starredCount: number;
    archivedCount: number;
    tagCounts: Record<string, number>;
  }> {
    await this.loadIndex();

    let totalMessages = 0;
    let starredCount = 0;
    let archivedCount = 0;
    const tagCounts: Record<string, number> = {};

    for (const summary of this.index.values()) {
      totalMessages += summary.messageCount;
      if (summary.starred) starredCount++;
      if (summary.archived) archivedCount++;
      
      if (summary.tags) {
        for (const tag of summary.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    return {
      totalConversations: this.index.size,
      totalMessages,
      starredCount,
      archivedCount,
      tagCounts,
    };
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager();
