import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AgentVersionInfo {
  id: string;
  version: number;
  name: string;
  description?: string;
  provider: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  voiceEnabled: boolean;
  voiceId: string;
  voiceSpeed: number;
  voiceModel: string;
  publishedBy?: string;
  changeNotes?: string;
  createdAt: Date;
}

export interface VersionDiff {
  field: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
}

@Injectable()
export class AgentVersioningService {
  private readonly logger = new Logger(AgentVersioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new version snapshot of an agent
   */
  async createVersion(
    agentId: string,
    userId: string,
    changeNotes?: string,
  ): Promise<AgentVersionInfo> {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const nextVersion = agent.version + 1;

    // Create version snapshot
    const version = await this.prisma.agentVersion.create({
      data: {
        agentId,
        version: nextVersion,
        name: agent.name,
        description: agent.description,
        provider: agent.provider,
        model: agent.model,
        systemPrompt: agent.systemPrompt,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        voiceEnabled: agent.voiceEnabled,
        voiceId: agent.voiceId,
        voiceSpeed: agent.voiceSpeed,
        voiceModel: agent.voiceModel,
        publishedBy: userId,
        changeNotes,
      },
    });

    // Update agent version number and publishedAt
    await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: {
        version: nextVersion,
        publishedAt: new Date(),
      },
    });

    this.logger.log(`Created version ${nextVersion} for agent ${agentId}`);

    return {
      id: version.id,
      version: version.version,
      name: version.name,
      description: version.description || undefined,
      provider: version.provider,
      model: version.model,
      systemPrompt: version.systemPrompt,
      temperature: version.temperature,
      maxTokens: version.maxTokens,
      voiceEnabled: version.voiceEnabled,
      voiceId: version.voiceId,
      voiceSpeed: version.voiceSpeed,
      voiceModel: version.voiceModel,
      publishedBy: version.publishedBy || undefined,
      changeNotes: version.changeNotes || undefined,
      createdAt: version.createdAt,
    };
  }

  /**
   * Get all versions of an agent
   */
  async getVersions(
    agentId: string,
    userId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    data: AgentVersionInfo[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    // Verify agent ownership
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      this.prisma.agentVersion.findMany({
        where: { agentId },
        orderBy: { version: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.agentVersion.count({ where: { agentId } }),
    ]);

    return {
      data: versions.map(v => ({
        id: v.id,
        version: v.version,
        name: v.name,
        description: v.description || undefined,
        provider: v.provider,
        model: v.model,
        systemPrompt: v.systemPrompt,
        temperature: v.temperature,
        maxTokens: v.maxTokens,
        voiceEnabled: v.voiceEnabled,
        voiceId: v.voiceId,
        voiceSpeed: v.voiceSpeed,
        voiceModel: v.voiceModel,
        publishedBy: v.publishedBy || undefined,
        changeNotes: v.changeNotes || undefined,
        createdAt: v.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a specific version
   */
  async getVersion(
    agentId: string,
    version: number,
    userId: string,
  ): Promise<AgentVersionInfo> {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const versionRecord = await this.prisma.agentVersion.findUnique({
      where: {
        agentId_version: { agentId, version },
      },
    });

    if (!versionRecord) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    return {
      id: versionRecord.id,
      version: versionRecord.version,
      name: versionRecord.name,
      description: versionRecord.description || undefined,
      provider: versionRecord.provider,
      model: versionRecord.model,
      systemPrompt: versionRecord.systemPrompt,
      temperature: versionRecord.temperature,
      maxTokens: versionRecord.maxTokens,
      voiceEnabled: versionRecord.voiceEnabled,
      voiceId: versionRecord.voiceId,
      voiceSpeed: versionRecord.voiceSpeed,
      voiceModel: versionRecord.voiceModel,
      publishedBy: versionRecord.publishedBy || undefined,
      changeNotes: versionRecord.changeNotes || undefined,
      createdAt: versionRecord.createdAt,
    };
  }

  /**
   * Rollback to a specific version
   */
  async rollback(
    agentId: string,
    version: number,
    userId: string,
  ): Promise<void> {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const versionRecord = await this.prisma.agentVersion.findUnique({
      where: {
        agentId_version: { agentId, version },
      },
    });

    if (!versionRecord) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    // First, create a version of the current state before rollback
    await this.createVersion(agentId, userId, `Auto-saved before rollback to v${version}`);

    // Apply the rollback
    await this.prisma.aIAgent.update({
      where: { id: agentId },
      data: {
        name: versionRecord.name,
        description: versionRecord.description,
        provider: versionRecord.provider,
        model: versionRecord.model,
        systemPrompt: versionRecord.systemPrompt,
        temperature: versionRecord.temperature,
        maxTokens: versionRecord.maxTokens,
        voiceEnabled: versionRecord.voiceEnabled,
        voiceId: versionRecord.voiceId,
        voiceSpeed: versionRecord.voiceSpeed,
        voiceModel: versionRecord.voiceModel,
      },
    });

    // Create a new version entry for the rollback
    await this.createVersion(agentId, userId, `Rolled back to version ${version}`);

    this.logger.log(`Agent ${agentId} rolled back to version ${version}`);
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    agentId: string,
    version1: number,
    version2: number,
    userId: string,
  ): Promise<VersionDiff[]> {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const [v1, v2] = await Promise.all([
      this.prisma.agentVersion.findUnique({
        where: { agentId_version: { agentId, version: version1 } },
      }),
      this.prisma.agentVersion.findUnique({
        where: { agentId_version: { agentId, version: version2 } },
      }),
    ]);

    if (!v1 || !v2) {
      throw new BadRequestException('One or both versions not found');
    }

    const diffs: VersionDiff[] = [];
    const fieldsToCompare = [
      'name',
      'description',
      'provider',
      'model',
      'systemPrompt',
      'temperature',
      'maxTokens',
      'voiceEnabled',
      'voiceId',
      'voiceSpeed',
      'voiceModel',
    ] as const;

    for (const field of fieldsToCompare) {
      const oldValue = v1[field];
      const newValue = v2[field];

      if (oldValue !== newValue) {
        diffs.push({
          field,
          oldValue: oldValue as string | number | boolean,
          newValue: newValue as string | number | boolean,
        });
      }
    }

    return diffs;
  }

  /**
   * Delete old versions keeping only the N most recent
   */
  async pruneOldVersions(
    agentId: string,
    userId: string,
    keepCount: number = 10,
  ): Promise<number> {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Get versions to delete
    const versions = await this.prisma.agentVersion.findMany({
      where: { agentId },
      orderBy: { version: 'desc' },
      skip: keepCount,
      select: { id: true },
    });

    if (versions.length === 0) {
      return 0;
    }

    const deleteResult = await this.prisma.agentVersion.deleteMany({
      where: {
        id: { in: versions.map(v => v.id) },
      },
    });

    this.logger.log(`Pruned ${deleteResult.count} old versions for agent ${agentId}`);

    return deleteResult.count;
  }
}
